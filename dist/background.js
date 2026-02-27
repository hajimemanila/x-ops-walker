"use strict";
(() => {
  // src/background.ts
  async function shiftTab(direction) {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      if (tabs.length <= 1) return void 0;
      tabs.sort((a, b) => a.index - b.index);
      const arrayPos = tabs.findIndex((t) => t.active);
      if (arrayPos === -1) return void 0;
      let nextPos = (arrayPos + direction + tabs.length) % tabs.length;
      for (let attempts = 0; attempts < tabs.length; attempts++) {
        const targetTab = tabs[nextPos];
        const url = targetTab.url ?? "";
        const isRestricted = url.startsWith("about:") || url.startsWith("chrome:") || url.startsWith("moz-extension:") || url.includes("addons.mozilla.org");
        if (!isRestricted) {
          await browser.tabs.update(targetTab.id, { active: true });
          return targetTab.id;
        }
        nextPos = (nextPos + direction + tabs.length) % tabs.length;
      }
    } catch (e) {
      console.error("[X-Ops Walker] shiftTab error:", e);
    }
    return void 0;
  }
  function sendArrivalBlur(tabId) {
    setTimeout(() => {
      const msg = { command: "FORCE_BLUR_ON_ARRIVAL" };
      browser.tabs.sendMessage(tabId, msg).catch(() => {
      });
    }, 50);
  }
  browser.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab?.id;
    (async () => {
      try {
        switch (message.command) {
          case "NEXT_TAB": {
            const nextId = await shiftTab(1);
            if (nextId !== void 0) sendArrivalBlur(nextId);
            break;
          }
          case "PREV_TAB": {
            const prevId = await shiftTab(-1);
            if (prevId !== void 0) sendArrivalBlur(prevId);
            break;
          }
          case "CLOSE_TAB": {
            if (tabId !== void 0) await browser.tabs.remove(tabId);
            break;
          }
          case "RELOAD_TAB": {
            if (tabId !== void 0) await browser.tabs.reload(tabId);
            break;
          }
          case "UNDO_CLOSE": {
            await browser.sessions.restore();
            break;
          }
          case "MUTE_TAB": {
            if (tabId === void 0) break;
            const tab = await browser.tabs.get(tabId);
            await browser.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
            break;
          }
          case "DISCARD_TAB": {
            const tabsToDiscard = await browser.tabs.query({
              currentWindow: true,
              active: false,
              pinned: false
            });
            const discardIds = tabsToDiscard.map((t) => t.id).filter((id) => id !== void 0);
            if (discardIds.length > 0) {
              await browser.tabs.discard(discardIds);
            }
            break;
          }
          case "GO_FIRST_TAB": {
            const allTabs = await browser.tabs.query({ currentWindow: true });
            allTabs.sort((a, b) => a.index - b.index);
            if (allTabs[0]?.id !== void 0) {
              await browser.tabs.update(allTabs[0].id, { active: true });
              sendArrivalBlur(allTabs[0].id);
            }
            break;
          }
          case "DUPLICATE_TAB": {
            if (tabId !== void 0) await browser.tabs.duplicate(tabId);
            break;
          }
          case "CLEAN_UP": {
            const tabsToKill = await browser.tabs.query({
              currentWindow: true,
              active: false,
              pinned: false
            });
            const targetIds = tabsToKill.map((t) => t.id).filter((id) => id !== void 0);
            if (targetIds.length > 0) {
              await browser.tabs.remove(targetIds);
            }
            break;
          }
          default:
            console.warn("[FoxWalker] Unknown command:", message.command);
        }
      } catch (err) {
        console.error(`[FoxWalker] Error [${message.command}]:`, err);
      }
    })();
    return true;
  });
})();
