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
    | 'CLEAN_UP';

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

                default:
                    console.warn('[FoxWalker] Unknown command:', message.command);
            }
        } catch (err) {
            console.error(`[FoxWalker] Error [${message.command}]:`, err);
        }
    })();

    return true; // 非同期応答チャネルを維持
});