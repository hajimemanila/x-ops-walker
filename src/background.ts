'use strict';

// ── URL制限チェック ────────────────────────────────────────────────────────────
// ① プロトコルベースの間騢ページ（Chrome: chrome://, Firefox: moz-extension:// 等）
function isRestrictedUrl(url: string | undefined): boolean {
    if (!url) return true;
    return (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('devtools://') ||
        url.startsWith('about:') ||
        url.startsWith('edge://') ||
        url.startsWith('moz-extension://') ||
        url.startsWith('firefox://')
    );
}

// ② ホストベースの間騢ページ（content script が定義上入るが実際には注入されない host_permissions 外）
// Firefox: addons.mozilla.org, support.mozilla.org は拡張機能がブロックされる
const FORBIDDEN_HOSTS = [
    'addons.mozilla.org',
    'support.mozilla.org',
    'accounts.google.com',
];

function isForbiddenHost(url: string | undefined): boolean {
    if (!url) return false;
    try {
        const hostname = new URL(url).hostname;
        return FORBIDDEN_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
    } catch {
        return false;
    }
}

// 結合判定: プロットコルまたはホストでブロックするページのみスキップ
function isSkippableTab(url: string | undefined): boolean {
    return isRestrictedUrl(url) || isForbiddenHost(url);
}

// ── 拡張機能インストール・更新時: 既存タブへの強制注入 ─────────────────────────
// content_scripts 宣言はページロード時にしか動かないため、
// 拡張機能のインストール・リロード直後に開かれているタブには
// kernel.js が存在しない。onInstalled で既存タブへ強制注入する。
chrome.runtime.onInstalled.addListener(async () => {
    // chrome.scripting is only available in Chrome (MV3 + "scripting" permission).
    // Firefox MV3 injects content scripts automatically via manifest declarations,
    // so this block is intentionally skipped on Firefox.
    if (!chrome.scripting) return;

    try {
        const tabs = await chrome.tabs.query({});
        const injectTargets = tabs.filter(tab =>
            tab.id !== undefined && !isRestrictedUrl(tab.url)
        );

        await Promise.allSettled(
            injectTargets.map(tab =>
                chrome.scripting.executeScript({
                    target: { tabId: tab.id! },
                    files: ['kernel.js'],
                })
            )
        );
    } catch (e) {
        console.error('[X-Ops Walker] onInstalled injection error:', e);
    }
});

// ── タブ移動処理（特権ページ・スキップ機能付き）───────────────────────────────
async function shiftTab(direction: 1 | -1): Promise<number | undefined> {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        if (tabs.length <= 1) return undefined;

        tabs.sort((a, b) => a.index - b.index);

        const arrayPos = tabs.findIndex(t => t.active);
        if (arrayPos === -1) return undefined;

        let nextPos = (arrayPos + direction + tabs.length) % tabs.length;

        for (let attempts = 0; attempts < tabs.length; attempts++) {
            const targetTab = tabs[nextPos];
            // isSkippableTab: プロトコルまたはホストでブロックされるページを除外
            if (!isSkippableTab(targetTab.url)) {
                await chrome.tabs.update(targetTab.id!, { active: true });
                return targetTab.id;
            }
            nextPos = (nextPos + direction + tabs.length) % tabs.length;
        }
    } catch (e) {
        console.error('[X-Ops Walker] shiftTab error:', e);
    }
    return undefined;
}

// ── Background → Content Script メッセージ型定義 ─────────────────────────────
type BackgroundCommand = 'FORCE_BLUR_ON_ARRIVAL' | 'MARK_SLEEPING' | 'ALM_REFOCUS';

interface BackgroundMessage {
    command: BackgroundCommand;
}

/**
 * タブ到着後に Arrival Override を送信する。
 * ブラウザ自身のフォーカス復元処理を待ってから blur を指示するため、
 * 50ms 遅延して content script へメッセージを送信する。
 *
 * NOTE (Chrome MV3): Service Worker は setTimeout 完了前にスリープする
 * リスクがある。この遅延は最小限に抑えてある。Step 2 でアーキテクチャ改善予定。
 */
function sendArrivalBlur(tabId: number): void {
    setTimeout(() => {
        const msg: BackgroundMessage = { command: 'FORCE_BLUR_ON_ARRIVAL' };
        chrome.tabs.sendMessage(tabId, msg).catch(() => {
            // content script がないページ（chrome:// 等）は無視
        });
    }, 50);
}

type FoxWalkerCommand =
    | 'NEXT_TAB'
    | 'PREV_TAB'
    | 'CLOSE_TAB'
    | 'RELOAD_TAB'
    | 'UNDO_CLOSE'
    | 'MUTE_TAB'
    | 'DISCARD_TAB'
    | 'GO_FIRST_TAB'
    | 'DUPLICATE_TAB'
    | 'CLEAN_UP'
    // ── ALM v1.3.0 ────────────────────────────────────────────────────────────
    // TAB_INACTIVE  : kernel が visibilitychange で「タブが非アクティブになった」を通知する。
    //                 ALM Master Timer がこのタイムスタンプを起点に Strategic Hibernation を予約する。
    // ALM_VETO      : 入力中・メディア再生中など、Hibernation を絶対禁止すべき状態を通知する。
    // ALM_VETO_CLEAR: Veto 状態が解除されたことを通知する（入力完了・再生停止等）。
    | 'TAB_INACTIVE'
    | 'ALM_VETO'
    | 'ALM_VETO_CLEAR';

interface FoxWalkerMessage {
    command: FoxWalkerCommand;
    // TAB_INACTIVE payload
    isHeavyDomain?: boolean;
}

// ── メインリスナー ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: FoxWalkerMessage, sender) => {
    const tabId = sender.tab?.id;

    (async () => {
        try {
            switch (message.command) {
                case 'NEXT_TAB': {
                    const nextId = await shiftTab(1);
                    if (nextId !== undefined) sendArrivalBlur(nextId);
                    break;
                }

                case 'PREV_TAB': {
                    const prevId = await shiftTab(-1);
                    if (prevId !== undefined) sendArrivalBlur(prevId);
                    break;
                }

                case 'CLOSE_TAB': {
                    if (tabId !== undefined) await chrome.tabs.remove(tabId);
                    break;
                }

                case 'RELOAD_TAB': {
                    if (tabId !== undefined) await chrome.tabs.reload(tabId);
                    break;
                }

                case 'UNDO_CLOSE': {
                    // sessions.restore() は Chrome では引数なしで動作するが、
                    // Firefox では sessionId が必須。
                    // getRecentlyClosed() で最新セッションを取得し、ID を渡すことで
                    // Chrome / Firefox どちらでも確実に動作する。
                    const recent = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
                    if (recent.length > 0) {
                        const sessionId = recent[0].tab?.sessionId ?? recent[0].window?.sessionId;
                        if (sessionId) await chrome.sessions.restore(sessionId);
                    }
                    break;
                }

                case 'MUTE_TAB': {
                    if (tabId === undefined) break;
                    const tab = await chrome.tabs.get(tabId);
                    await chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
                    break;
                }

                case 'DISCARD_TAB': {
                    // GG: 非アクティブ・非ピン留め・未破棄のタブをスリープ（メモリ解放）
                    const tabsToDiscard = await chrome.tabs.query({
                        currentWindow: true,
                        active: false,
                        pinned: false,
                        discarded: false,
                    });

                    for (const tab of tabsToDiscard) {
                        if (tab.id === undefined) continue;
                        const url = tab.url ?? '';
                        if (isSkippableTab(url)) continue;

                        try {
                            // 💤 プレフィックス: content script 経由で付与（Chrome/Firefox 共通）
                            // 重要: sendMessage の後、content script が処理するまでの少しのインターバルを許可するため
                            // discard 実行前に 30ms yield する。これにより Chrome でのタイトル書き換えを保証する。
                            chrome.tabs.sendMessage(tab.id, { command: 'MARK_SLEEPING' }).catch(() => { });
                            await new Promise<void>(r => setTimeout(r, 30));
                            await chrome.tabs.discard(tab.id);
                        } catch (e) {
                            console.warn(`[X-Ops Walker] discard(${tab.id}) skipped:`, e);
                        }
                    }
                    break;
                }

                case 'GO_FIRST_TAB': {
                    const allTabs = await chrome.tabs.query({ currentWindow: true });
                    allTabs.sort((a, b) => a.index - b.index);
                    if (allTabs[0]?.id !== undefined) {
                        await chrome.tabs.update(allTabs[0].id!, { active: true });
                        sendArrivalBlur(allTabs[0].id!);
                    }
                    break;
                }

                case 'DUPLICATE_TAB': {
                    // CC: タブを複製（ログイン状態・Cookieを完全継承）
                    if (tabId !== undefined) await chrome.tabs.duplicate(tabId);
                    break;
                }

                case 'CLEAN_UP': {
                    // Shift+T: アクティブ・ピン留め以外を全て閉じる
                    const tabsToKill = await chrome.tabs.query({
                        currentWindow: true,
                        active: false,
                        pinned: false,
                    });
                    const targetIds = tabsToKill
                        .map(t => t.id)
                        .filter((id): id is number => id !== undefined);
                    if (targetIds.length > 0) {
                        await chrome.tabs.remove(targetIds);
                    }
                    break;
                }

                // ── ALM v1.3.0: Kernel からの状態通知 ────────────────────────────────
                case 'TAB_INACTIVE': {
                    // kernel.ts の visibilitychange から受信。
                    // タブが非アクティブになった瞬間のタイムスタンプを記録し、
                    // Master Timer がこの値を起点に Strategic Hibernation を予約する。
                    if (tabId === undefined) break;
                    const existing = almStates.get(tabId);
                    almStates.set(tabId, {
                        inactiveAt: Date.now(),
                        isHeavyDomain: message.isHeavyDomain ?? existing?.isHeavyDomain ?? false,
                        veto: existing?.veto ?? false,
                    });
                    break;
                }

                case 'ALM_VETO': {
                    // 入力中・メディア再生中など、Strategic Hibernation の絶対禁止を宣言する。
                    // Veto が立っている間は Master Timer がそのタブをスキップする。
                    if (tabId === undefined) break;
                    const state = almStates.get(tabId);
                    if (state) {
                        state.veto = true;
                    } else {
                        // 状態が未登録（ページロード直後など）でも Veto だけは確実に記録する
                        almStates.set(tabId, { inactiveAt: null, isHeavyDomain: false, veto: true });
                    }
                    break;
                }

                case 'ALM_VETO_CLEAR': {
                    // Veto 状態の解除（入力完了・再生停止後に kernel から送信される）。
                    // Veto が解除された時点で inactiveAt を更新し、猶予期間を再計算させる。
                    if (tabId === undefined) break;
                    const vetoState = almStates.get(tabId);
                    if (vetoState) {
                        vetoState.veto = false;
                        // Veto 解除 = 「今この瞬間から」猶予をカウントし直す
                        vetoState.inactiveAt = Date.now();
                    }
                    break;
                }

                default:
                    console.warn('[FoxWalker] Unknown command:', message.command);
            }
        } catch (err) {
            console.error(`[FoxWalker] Error [${message.command}]:`, err);
        }
    })();

    return true; // 非同期応答チャネルを維持
});

// ── Service Worker Keep-Alive: Port 受け口 ────────────────────────────────
// Content Script（kernel.ts）が接続する 'walker-keepalive' ポートを受け入れる。
// ポートが開いている限り Chrome は Service Worker を休止させない（MV3 公式仕様）。
// このリスナーを配置するだけで効果が発生する — 特別なメッセージ処理は不要。
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'walker-keepalive') return;
    // ポート参照を保持することで GC を防ぎ、接続を維持する
    port.onDisconnect.addListener(() => {
        // Content Script が破棄された（タブ閉鎖等）— 次の接続を待つだけ
    });
});


// ============================================================================
// X-Ops Walker ALM (Adaptive Lifecycle Management) v1.3.0
// ============================================================================
//
// 【用語定義 — これらの用語を厳守せよ】
//   Execution Dormancy   : ブラウザが勝手に行う「安楽死（休止状態）」。ALM が排除する敵。
//   Strategic Hibernation: ALM が意図的に行う「冷凍休眠（Discard）」。我々が支配する。
//   Vital Heartbeat      : kernel から送る「生存信号」。Veto の根拠となる。
//   Pure Rebirth         : ユーザーがタブを開いた際の再読み込みによる「確実な転生（起動）」。
//
// 【Master Heartbeat Timer の設計思想】
//   タブごとに個別タイマーを回すと、50枚のタブで50本の setTimeout が Service Worker で
//   走ることになる。これはリソースの無駄であり、タイマー精度も保証されない。
//   → Background に「1分間隔のマスタータイマー」を1本だけ置き、全タブを走査・一括処理する。
//   → SW の休止は walker-keepalive Port（既存機構）が既に阻止しているため、1本で完結する。
//
// ============================================================================

// ── Heavy Domain 定義 ────────────────────────────────────────────────────────
// メモリ消費が激しい「重量ドメイン」。非アクティブになった瞬間に短縮 Grace Period を適用し、
// よりアグレッシブに Strategic Hibernation を予約する。
const ALM_HEAVY_DOMAINS = new Set([
    'x.com',
    'twitter.com',
    'gemini.google.com',
    'chatgpt.com',
    'claude.ai',
    'chat.deepseek.com',
    'copilot.microsoft.com',
    'perplexity.ai',
    'grok.com',
    'figma.com',
    'canva.com',
    'notion.so',
    'www.youtube.com',
]);

// ── Grace Period 定数 (ミリ秒) ─────────────────────────────────────────────
// Standard: タブ30枚以下のデフォルト。8分の余裕を与える。
// Standard (Overloaded): タブ30枚超。動的に5分へ短縮し、よりアグレッシブにリソース回収。
// Heavy: X.com / AI Chat 等の重量ドメイン。1分後に Strategic Hibernation を実行する。
//        ただし Vital Heartbeat（入力中・再生中）が届いている間は Veto により絶対禁止。
const ALM_GRACE_STANDARD_MS = 8 * 60 * 1000;        //   8分
const ALM_GRACE_STANDARD_OVERLOADED_MS = 5 * 60 * 1000; //   5分（30枚超タブ数で動的短縮）
const ALM_GRACE_HEAVY_MS = 1 * 60 * 1000;           //   1分
const ALM_OVERLOAD_THRESHOLD = 30;                   //  30枚超でオーバーロードモード
const ALM_MASTER_INTERVAL_MS = 60 * 1000;            //   1分間隔のマスタータイマー

// ── ALM タブ状態 ─────────────────────────────────────────────────────────────
interface AlmTabState {
    /** タブが非アクティブになった UNIX タイムスタンプ（ms）。null = まだ非アクティブになっていない */
    inactiveAt: number | null;
    /** Heavy Domain フラグ。TAB_INACTIVE 受信時に kernel から報告される */
    isHeavyDomain: boolean;
    /** Vital Heartbeat による Hibernation 絶対禁止フラグ。真の間はいかなるタイマーも無視する */
    veto: boolean;
}

/** 全タブの ALM 状態を保持するマスターマップ */
const almStates = new Map<number, AlmTabState>();

// ── タブ削除時のクリーンアップ ───────────────────────────────────────────────
// タブが閉じられた際は almStates から即座に除去し、メモリリークを防ぐ。
chrome.tabs.onRemoved.addListener((tabId) => {
    almStates.delete(tabId);
});

// ── Strategic Hibernation: 実行関数 ──────────────────────────────────────────
/**
 * 指定タブに対して Strategic Hibernation (chrome.tabs.discard) を実行する。
 * discard 直前に「本当にそのタブが非アクティブか」を再確認するガード節を持ち、
 * 万が一タブが復帰していた場合には Hibernation を中止する（二重確認の絶対保証）。
 *
 * @param tabId  - Discard対象のタブID
 * @param state  - そのタブの現在の ALM 状態
 */
async function executeStrategicHibernation(tabId: number, state: AlmTabState): Promise<void> {
    try {
        // ── 二重確認ガード: discard 直前に実際のタブ状態を Chrome API で確認する ──
        // Master Timer の走査から実際の discard 実行まで僅かな時間差が生じる。
        // その間にユーザーがタブを切り替えた場合、active タブを殺してしまう最悪の事態を防ぐ。
        const liveTab = await chrome.tabs.get(tabId);

        // ガード節 1: タブがアクティブに復帰している → Hibernation 中止
        if (liveTab.active) return;

        // ガード節 2: タブが既に破棄済み → 二重実行を防ぐ
        if (liveTab.discarded) return;

        // ガード節 3: タブがピン留めされている → System-Protect Veto
        if (liveTab.pinned) return;

        // ガード節 4: 制限URLへの二重チェック
        if (isSkippableTab(liveTab.url)) return;

        // 💤 プレフィックスを付与してからスリープ（DISCARD_TAB コマンドと同じ手順）
        chrome.tabs.sendMessage(tabId, { command: 'MARK_SLEEPING' }).catch(() => { });
        await new Promise<void>(r => setTimeout(r, 30));
        await chrome.tabs.discard(tabId);

        console.debug(`[ALM] Strategic Hibernation executed: tabId=${tabId} heavy=${state.isHeavyDomain}`);
    } catch (e) {
        // タブが既に存在しない（ユーザーが手動で閉じた等）は正常系 — 静かに無視
        console.debug(`[ALM] Hibernation skipped (tab gone): tabId=${tabId}`, e);
    }
}

// ── Master Heartbeat Timer: 全タブを走査・一括処理 ───────────────────────────
/**
 * 1分ごとに発火する「マスタータイマー」のコア処理。
 * タブごとに個別タイマーを持つことなく、全タブの状態を一括で走査する。
 *
 * 【動的負荷調整ロジック】
 *   現在ウィンドウ内のタブ総数が ALM_OVERLOAD_THRESHOLD（30枚）を超えた場合、
 *   Standard ドメインの Grace Period を 8分 → 5分 に自動短縮する。
 *   これにより過負荷状態でもアグレッシブにリソースを回収する。
 */
async function scanAndHibernate(): Promise<void> {
    try {
        // 全タブを取得して総数を把握する
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const totalTabCount = allTabs.length;

        // 30枚超なら Overloaded モード → Standard の猶予を5分に短縮
        const isOverloaded = totalTabCount > ALM_OVERLOAD_THRESHOLD;
        const standardGrace = isOverloaded
            ? ALM_GRACE_STANDARD_OVERLOADED_MS  // 5分（動的短縮）
            : ALM_GRACE_STANDARD_MS;            // 8分（デフォルト）

        const now = Date.now();

        for (const [tabId, state] of almStates) {
            // 非アクティブ化タイムスタンプが未記録 → まだ猶予計算の対象外
            if (state.inactiveAt === null) continue;

            // ── Veto チェック（Hibernation 絶対禁止）─────────────────────────
            // 以下のいずれかに該当する場合、いかなるタイマーも無視して Hibernation を拒否する。
            //   Form-Interference : isInputActive が真、または未送信テキストが存在する
            //   Media-Capture     : 動画・音声が再生中（play イベント由来）
            //   Navigation-Lock   : beforeunload リスナーが活性、またはファイル転送中
            //   （System-Protect  : ピン留めは executeStrategicHibernation のガード節で捕捉）
            if (state.veto) continue;

            // ── Grace Period 判定 ─────────────────────────────────────────────
            const grace = state.isHeavyDomain ? ALM_GRACE_HEAVY_MS : standardGrace;
            const elapsed = now - state.inactiveAt;

            if (elapsed >= grace) {
                // 猶予期間満了 → Strategic Hibernation を実行
                // almStates から先に削除することで、次のティックで二重実行されるのを防ぐ
                almStates.delete(tabId);
                // 非同期実行（await しない）— タブが複数あっても並列で処理する
                executeStrategicHibernation(tabId, state);
            }
        }
    } catch (e) {
        console.warn('[ALM] scanAndHibernate error:', e);
    }
}

// ── Master Heartbeat Timer の起動 ─────────────────────────────────────────────
// 【注意】setInterval は Service Worker 内では信頼性が低い。
// しかし、kernel.ts 側の connectKeepAlivePort() が walker-keepalive Port を常時接続し、
// Chrome MV3 公式仕様により「Port 接続中は SW を休止させない」状態を維持している。
// このため、ALM の Master Timer は walker-keepalive に完全に依存して動作する。
// keepalive Port なしで ALM は機能しない — これは意図的な設計上の依存関係である。
setInterval(scanAndHibernate, ALM_MASTER_INTERVAL_MS);