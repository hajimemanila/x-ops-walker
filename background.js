'use strict';

/**
 * タブ移動処理（特権ページ・スキップ機能付き）：
 * 移動先が特権ページ（about: 等）だった場合、さらにその次を探して移動する。
 */
async function shiftTab(direction) {
    try {
        const tabs = await browser.tabs.query({ currentWindow: true });
        if (tabs.length <= 1) return;

        tabs.sort((a, b) => a.index - b.index);
        const activeTab = tabs.find(t => t.active);
        if (!activeTab) return;

        let nextIndex = (activeTab.index + direction + tabs.length) % tabs.length;

        // ── スキップ・ロジック開始 ──
        let attempts = 0;
        // 特権ページ、あるいは拡張機能の動作対象外URLを検知
        while (attempts < tabs.length) {
            const targetTab = tabs[nextIndex];
            const url = targetTab.url;

            // スキップ対象：about:, chrome:, addons.mozilla.org, moz-extension:
            const isRestricted = url.startsWith('about:') ||
                url.startsWith('chrome:') ||
                url.startsWith('moz-extension:') ||
                url.includes('addons.mozilla.org');

            if (!isRestricted) {
                // 操作可能なページが見つかったら即移動
                await browser.tabs.update(targetTab.id, { active: true });
                return;
            }

            // 特権ページだったので、さらに同じ方向にずらす
            nextIndex = (nextIndex + direction + tabs.length) % tabs.length;
            attempts++;
        }
        // ── スキップ・ロジック終了 ──

    } catch (e) {
        console.error("ShiftTab Error:", e);
    }
}

/**
 * メインリスナー：
 * 信号を受け取り、各コマンドを実行。省略なし。
 */
browser.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab.id;
    const windowId = sender.tab.windowId;

    // 非同期処理を確実に完遂させるための即時実行関数
    (async () => {
        try {
            switch (message.command) {
                case 'NEXT_TAB':
                    await shiftTab(1);
                    break;

                case 'PREV_TAB':
                    await shiftTab(-1);
                    break;

                case 'CLOSE_TAB':
                    await browser.tabs.remove(tabId);
                    break;

                case 'RELOAD_TAB':
                    await browser.tabs.reload(tabId);
                    break;

                case 'UNDO_CLOSE':
                    await browser.sessions.restore();
                    break;

                case 'MUTE_TAB':
                    const tab = await browser.tabs.get(tabId);
                    await browser.tabs.update(tabId, { muted: !tab.mutedInfo.muted });
                    break;

                case 'DISCARD_TAB':
                    /**
                     * GG: 開いているタブおよびピン留めされているタブ「以外」すべてをDiscard
                     */
                    const tabsToDiscard = await browser.tabs.query({
                        currentWindow: true,
                        active: false,
                        pinned: false
                    });
                    const discardIds = tabsToDiscard.map(t => t.id);
                    if (discardIds.length > 0) {
                        await browser.tabs.discard(discardIds);
                    }
                    break;

                case 'GO_FIRST_TAB':
                    const allTabs = await browser.tabs.query({ currentWindow: true });
                    const first = allTabs.sort((a, b) => a.index - b.index)[0];
                    if (first) {
                        await browser.tabs.update(first.id, { active: true });
                    }
                    break;

                case 'CLEAN_UP':
                    /**
                     * 00: 開いているタブおよびピン留めされているタブ「以外」すべてを閉じる
                     */
                    const tabsToKill = await browser.tabs.query({
                        currentWindow: true,
                        active: false,
                        pinned: false
                    });
                    const targetIds = tabsToKill.map(t => t.id);
                    if (targetIds.length > 0) {
                        await browser.tabs.remove(targetIds);
                    }
                    break;

                default:
                    console.warn("Unknown command:", message.command);
            }
        } catch (err) {
            console.error(`Execution error [${message.command}]:`, err);
        }
    })();

    // 外部メッセージに対してtrueを返し、チャネルを維持
    return true;
});