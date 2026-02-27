'use strict';

/**
 * タブ移動処理（特権ページ・スキップ機能付き）
 *
 * 【バグ修正】activeTab.index はFirefoxのグローバルタブインデックスであり、
 * ソート後の tabs[] 配列の添字（0, 1, 2...）とは別物。
 * そのため配列上の位置（findIndex）を使って nextIndex を計算する。
 */
async function shiftTab(direction: 1 | -1): Promise<number | undefined> {
    try {
        const tabs = await browser.tabs.query({ currentWindow: true });
        if (tabs.length <= 1) return undefined;

        tabs.sort((a, b) => a.index - b.index);

        const arrayPos = tabs.findIndex(t => t.active);
        if (arrayPos === -1) return undefined;

        let nextPos = (arrayPos + direction + tabs.length) % tabs.length;

        for (let attempts = 0; attempts < tabs.length; attempts++) {
            const targetTab = tabs[nextPos];
            const url = targetTab.url ?? '';

            const isRestricted =
                url.startsWith('about:') ||
                url.startsWith('chrome:') ||
                url.startsWith('moz-extension:') ||
                url.includes('addons.mozilla.org');

            if (!isRestricted) {
                await browser.tabs.update(targetTab.id!, { active: true });
                return targetTab.id;  // 活性化したタブIDを返す
            }

            nextPos = (nextPos + direction + tabs.length) % tabs.length;
        }
    } catch (e) {
        console.error('[X-Ops Walker] shiftTab error:', e);
    }
    return undefined;
}

// ── Background → Content Script メッセージ型定義 ───────────────────────────────
type BackgroundCommand = 'FORCE_BLUR_ON_ARRIVAL';

interface BackgroundMessage {
    command: BackgroundCommand;
}

/**
 * タブ到着後に Arrival Override を送信する。
 * ブラウザ自身のフォーカス復元処理を待ってから blur を指示するため、
 * 50ms 遺延して content script へメッセージを送信する。
 */
function sendArrivalBlur(tabId: number): void {
    setTimeout(() => {
        const msg: BackgroundMessage = { command: 'FORCE_BLUR_ON_ARRIVAL' };
        browser.tabs.sendMessage(tabId, msg).catch(() => {
            // content script がないページ（about: 等）は無視
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

/**
 * メインリスナー
 */
browser.runtime.onMessage.addListener((message: FoxWalkerMessage, sender) => {
    // sender.tab は content script からのメッセージにのみ存在する
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
                    if (tabId !== undefined) await browser.tabs.remove(tabId);
                    break;
                }

                case 'RELOAD_TAB': {
                    if (tabId !== undefined) await browser.tabs.reload(tabId);
                    break;
                }

                case 'UNDO_CLOSE': {
                    // sessions.restore() は引数なしで最後に閉じたタブを復元
                    await browser.sessions.restore();
                    break;
                }

                case 'MUTE_TAB': {
                    if (tabId === undefined) break;
                    const tab = await browser.tabs.get(tabId);
                    await browser.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
                    break;
                }

                case 'DISCARD_TAB': {
                    // GG: アクティブ・ピン留め以外を全てDiscard（メモリ解放）
                    const tabsToDiscard = await browser.tabs.query({
                        currentWindow: true,
                        active: false,
                        pinned: false
                    });
                    const discardIds = tabsToDiscard
                        .map(t => t.id)
                        .filter((id): id is number => id !== undefined);
                    if (discardIds.length > 0) {
                        await browser.tabs.discard(discardIds);
                    }
                    break;
                }

                case 'GO_FIRST_TAB': {
                    const allTabs = await browser.tabs.query({ currentWindow: true });
                    allTabs.sort((a, b) => a.index - b.index);
                    if (allTabs[0]?.id !== undefined) {
                        await browser.tabs.update(allTabs[0].id!, { active: true });
                        sendArrivalBlur(allTabs[0].id!);
                    }
                    break;
                }

                case 'DUPLICATE_TAB': {
                    // CC: タブを複製（コンテナ・セッション・ログイン状態を完全継承）
                    if (tabId !== undefined) await browser.tabs.duplicate(tabId);
                    break;
                }

                case 'CLEAN_UP': {
                    // 00: アクティブ・ピン留め以外を全て閉じる
                    const tabsToKill = await browser.tabs.query({
                        currentWindow: true,
                        active: false,
                        pinned: false
                    });
                    const targetIds = tabsToKill
                        .map(t => t.id)
                        .filter((id): id is number => id !== undefined);
                    if (targetIds.length > 0) {
                        await browser.tabs.remove(targetIds);
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