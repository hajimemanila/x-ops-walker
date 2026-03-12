'use strict';

import { GlobalState, PhantomState, AlmConfig, DEFAULT_GLOBAL_STATE, DEFAULT_PHANTOM_STATE, DEFAULT_ALM_CONFIG } from './config/state';

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
    // ── [PHASE 2] Phantom State Migration ──
    try {
        const result = await chrome.storage.local.get(null);
        let needsUpdate = false;

        const globalState: GlobalState = result.global || { ...DEFAULT_GLOBAL_STATE };
        const phantomState: PhantomState = result.phantom || { ...DEFAULT_PHANTOM_STATE };

        // Flat keys -> Hierarchy mapping
        if ('isWalkerMode' in result) {
            globalState.walkerMode = result.isWalkerMode;
            needsUpdate = true;
        }
        if ('blockGoogleOneTap' in result) {
            globalState.blockOneTap = result.blockGoogleOneTap;
            needsUpdate = true;
        }
        if (result.alm && 'safetyEnter' in result.alm) {
            globalState.safetyEnter = result.alm.safetyEnter;
            needsUpdate = true;
        }
        if ('xWalker' in result && !result.phantom) {
            phantomState.xWalker = result.xWalker;
            needsUpdate = true;
        }

        if (needsUpdate || !result.global || !result.phantom) {
            await chrome.storage.local.set({
                global: globalState,
                phantom: phantomState
            });
            await chrome.storage.local.remove(['isWalkerMode', 'blockGoogleOneTap']);
            console.log('[X-Ops Walker] Phantom State Migration Complete.');
        }
    } catch (e) {
        console.error('[X-Ops Walker] Migration error:', e);
    }

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
type BackgroundCommand = 'FORCE_BLUR_ON_ARRIVAL' | 'MARK_SLEEPING';

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
    // ALM_VETO      : 入力中・メディア再生中など、Hibernation を絶対禁止すべき状態を通知する。
    // ALM_VETO_CLEAR: Veto 状態が解除されたことを通知する（入力完了・再生停止等）。
    | 'ALM_VETO'
    | 'ALM_VETO_CLEAR';

interface FoxWalkerMessage {
    command: FoxWalkerCommand;
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
                case 'ALM_VETO': {
                    // 入力中・メディア再生中など、Smart Tab Discard の絶対禁止を宣言する。
                    // Veto が立っている間は Master Timer がそのタブをスキップする。
                    if (tabId === undefined) break;
                    const state = almStates.get(tabId);
                    if (state) {
                        state.veto = true;
                    } else {
                        // 状態が未登録（ページロード直後など）でも Veto だけは確実に記録する
                        almStates.set(tabId, { inactiveAt: null, isExcluded: false, veto: true });
                    }
                    saveAlmStatesToStorage();
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
                    saveAlmStatesToStorage();
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
//   Smart Tab Discard: ALM が意図的に行う「冷凍休眠（Discard）」。我々が支配する。
//   Vital Heartbeat      : kernel から送る「生存信号」。Veto の根拠となる。
//   Pure Rebirth         : ユーザーがタブを開いた際の再読み込みによる「確実な転生（起動）」。
//
// 【Master Heartbeat Timer の設計思想】
//   タブごとに個別タイマーを回すと、50枚のタブで50本の setTimeout が Service Worker で
//   走ることになる。これはリソースの無駄であり、タイマー精度も保証されない。
//   → Background に「3分間隔のマスタータイマー」を1本だけ置き、全タブを走査・一括処理する。
//   → SW の休止は walker-keepalive Port（既存機構）が既に阻止しているため、1本で完結する。
//
// ============================================================================


let ALM_EXCLUDE_DOMAINS = new Set(DEFAULT_ALM_CONFIG.excludeDomains);

// 実行中の ALM コンフィグ
let currentAlmConfig: AlmConfig = {
    enabled: true,
    excludeDomains: Array.from(ALM_EXCLUDE_DOMAINS)
};

// コンフィグのロード完了を待機するプロミス
let isAlmConfigLoaded = false;
const configLoadPromise = new Promise<void>((resolve) => {
    chrome.storage.local.get('alm', (res) => {
        if (res.alm) {
            // マイグレーション対応: 古い heavyDomains がストレージに残っていた場合は excludeDomains として引き継ぐ
            const loadedDomains = res.alm.excludeDomains || res.alm.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains;

            currentAlmConfig = res.alm;
            currentAlmConfig.excludeDomains = loadedDomains;
            ALM_EXCLUDE_DOMAINS = new Set(loadedDomains);

            if (currentAlmConfig.enabled) {
                chrome.alarms.create('alm-master-timer', { periodInMinutes: 1 });
            } else {
                chrome.alarms.clear('alm-master-timer');
            }
        } else {
            chrome.alarms.create('alm-master-timer', { periodInMinutes: 1 });
        }
        isAlmConfigLoaded = true;
        resolve();
    });
});

// UI（Options / Popup）からの設定変更を瞬時に同期する
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.alm) {
        // anyキャストで古い型からの移行エラーを回避
        const newConf = changes.alm.newValue as any;
        if (!newConf) return;

        const wasEnabled = currentAlmConfig.enabled;
        const newDomains = newConf.excludeDomains || newConf.heavyDomains || [];

        currentAlmConfig = {
            enabled: Boolean(newConf.enabled),
            excludeDomains: newDomains
        };
        ALM_EXCLUDE_DOMAINS = new Set(newDomains);

        // Timer 制御: 有効/無効の切り替え
        if (wasEnabled && !newConf.enabled) {
            console.debug('[ALM] Master Timer Disabled via UI');
            chrome.alarms.clear('alm-master-timer');
        } else if (!wasEnabled && newConf.enabled) {
            console.debug('[ALM] Master Timer Enabled via UI');
            chrome.alarms.create('alm-master-timer', { periodInMinutes: 1 });
        }
    }
});

// ── Grace Period 定数 (ミリ秒) ─────────────────────────────────────────────
// Standard: タブ30枚以下のデフォルト。8分の余裕を与える。
// Standard (Overloaded): タブ30枚超。動的に5分へ短縮し、よりアグレッシブにリソース回収。
// ※ Heavy (1分短縮) は廃止され、Exclude (永久除外) リストへ移行。
const ALM_GRACE_STANDARD_MS = 8 * 60 * 1000;        //  8分
const ALM_GRACE_STANDARD_OVERLOADED_MS = 5 * 60 * 1000; //  5分（30枚超タブ数で動的短縮）
const ALM_OVERLOAD_THRESHOLD = 30;                   //  30枚超でオーバーロードモード

// ── ALM タブ状態 ─────────────────────────────────────────────────────────────
interface AlmTabState {
    /** タブが非アクティブになった UNIX タイムスタンプ（ms）。null = まだ非アクティブになっていない */
    inactiveAt: number | null;
    /** Discard 除外フラグ。タブ遷移時に Background で判定・記録される */
    isExcluded: boolean;
    /** Vital Heartbeat による Hibernation 絶対禁止フラグ。真の間はいかなるタイマーも無視する */
    veto: boolean;
}

/** 全タブの ALM 状態を保持するマスターマップ */
const almStates = new Map<number, AlmTabState>();

// ── 永続化レイヤー (Persistent Storage Layer) ───────────────────────────────
async function saveAlmStatesToStorage(): Promise<void> {
    try {
        const statesObj = Object.fromEntries(almStates);
        await chrome.storage.local.set({ alm_tab_states: statesObj });
    } catch (e) {
        console.warn('[ALM] saveAlmStatesToStorage error:', e);
    }
}

async function loadAlmStatesFromStorage(): Promise<boolean> {
    try {
        const res = await chrome.storage.local.get('alm_tab_states');
        if (res.alm_tab_states) {
            for (const [key, value] of Object.entries(res.alm_tab_states)) {
                almStates.set(Number(key), value as AlmTabState);
            }
            return true;
        }
    } catch (e) {
        console.warn('[ALM] loadAlmStatesFromStorage error:', e);
    }
    return false;
}

// ── Service Worker の起動・再起動時の状態復元 ─────────────────────────────
async function initializeAlmStates(): Promise<void> {
    await loadAlmStatesFromStorage();

    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    for (const tab of tabs) {
        if (tab.id === undefined) continue;
        if (!almStates.has(tab.id) && !tab.active) {
            let isExcluded = false;
            try { if (tab.url) isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(tab.url).hostname); } catch { }
            almStates.set(tab.id, { inactiveAt: now, isExcluded: isExcluded, veto: false });
        }
    }
    saveAlmStatesToStorage();
}
initializeAlmStates();

// ── タブ削除時のクリーンアップ ───────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
    almStates.delete(tabId);
    saveAlmStatesToStorage();
});

chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id === undefined || tab.active) return;
    let isExcluded = false;
    try { if (tab.url) isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(tab.url).hostname); } catch { }
    almStates.set(tab.id, { inactiveAt: Date.now(), isExcluded: isExcluded, veto: false });
    saveAlmStatesToStorage();
});

// ── Smart Tab Discard: 実行関数 ──────────────────────────────────────────
async function executeStrategicHibernation(tabId: number, state: AlmTabState): Promise<void> {
    try {
        const liveTab = await chrome.tabs.get(tabId);

        if (liveTab.active) return;
        if (liveTab.discarded) return;
        if (liveTab.pinned) return;
        if (isSkippableTab(liveTab.url)) return;

        chrome.tabs.sendMessage(tabId, { command: 'MARK_SLEEPING' }).catch(() => { });
        await new Promise<void>(r => setTimeout(r, 30));
        await chrome.tabs.discard(tabId);

        console.debug(`[ALM] Smart Tab Discard executed: tabId=${tabId} excluded=${state.isExcluded}`);
    } catch (e) {
        console.debug(`[ALM] Hibernation skipped (tab gone): tabId=${tabId}`, e);
    }
}

// ── Master Heartbeat Timer: 全タブを走査・一括処理 ───────────────────────────
async function scanAndHibernate(): Promise<void> {
    if (!isAlmConfigLoaded) await configLoadPromise;
    if (!currentAlmConfig.enabled) return;

    if (almStates.size === 0) {
        await loadAlmStatesFromStorage();
    }

    try {
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const totalTabCount = allTabs.length;

        const isOverloaded = totalTabCount > ALM_OVERLOAD_THRESHOLD;
        const standardGrace = isOverloaded
            ? ALM_GRACE_STANDARD_OVERLOADED_MS
            : ALM_GRACE_STANDARD_MS;

        const now = Date.now();

        for (const [tabId, state] of almStates) {
            if (state.inactiveAt === null) continue;

            // ── Veto および Exclude チェック（Hibernation 絶対禁止）─────────────────────────
            // Veto（入力中・再生中等）または Excludeドメイン の場合はタイマーを完全に無視する
            if (state.veto || state.isExcluded) continue;

            // ── Grace Period 判定 ─────────────────────────────────────────────
            const elapsed = now - state.inactiveAt;

            if (elapsed >= standardGrace) {
                almStates.delete(tabId);
                saveAlmStatesToStorage();
                executeStrategicHibernation(tabId, state);
            }
        }
    } catch (e) {
        console.warn('[ALM] scanAndHibernate error:', e);
    }
}

// ── 堅牢な ALM 状態トラッキング (Background 完結型) ──────────────────────────
const windowActiveTabs = new Map<number, number>();

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const prevTabId = windowActiveTabs.get(activeInfo.windowId);
    windowActiveTabs.set(activeInfo.windowId, activeInfo.tabId);

    const newState = almStates.get(activeInfo.tabId) ?? { inactiveAt: null, isExcluded: false, veto: false };
    newState.inactiveAt = null;
    almStates.set(activeInfo.tabId, newState);

    if (prevTabId !== undefined) {
        try {
            const prevTab = await chrome.tabs.get(prevTabId);
            const isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(prevTab.url ?? '').hostname);
            const prevState = almStates.get(prevTabId) ?? { inactiveAt: Date.now(), isExcluded: isExcluded, veto: false };
            prevState.inactiveAt = Date.now();
            prevState.isExcluded = isExcluded;
            almStates.set(prevTabId, prevState);
        } catch {
        }
    }
    saveAlmStatesToStorage();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        try {
            const isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(changeInfo.url).hostname);
            const state = almStates.get(tabId);
            if (state) {
                state.isExcluded = isExcluded;
                saveAlmStatesToStorage();
            }
        } catch { }
    }
});

// ── Master Heartbeat Timer の Alarm 化 ─────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'alm-master-timer') {
        scanAndHibernate();
    }
});