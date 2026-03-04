"use strict";
(() => {
  // src/background.ts
  function isRestrictedUrl(url) {
    if (!url) return true;
    return url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("devtools://") || url.startsWith("about:") || url.startsWith("edge://") || url.startsWith("moz-extension://") || url.startsWith("firefox://");
  }
  var FORBIDDEN_HOSTS = [
    "addons.mozilla.org",
    "support.mozilla.org",
    "accounts.google.com"
  ];
  function isForbiddenHost(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url).hostname;
      return FORBIDDEN_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h));
    } catch {
      return false;
    }
  }
  function isSkippableTab(url) {
    return isRestrictedUrl(url) || isForbiddenHost(url);
  }
  chrome.runtime.onInstalled.addListener(async () => {
    if (!chrome.scripting) return;
    try {
      const tabs = await chrome.tabs.query({});
      const injectTargets = tabs.filter(
        (tab) => tab.id !== void 0 && !isRestrictedUrl(tab.url)
      );
      await Promise.allSettled(
        injectTargets.map(
          (tab) => chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["kernel.js"]
          })
        )
      );
    } catch (e) {
      console.error("[X-Ops Walker] onInstalled injection error:", e);
    }
  });
  async function shiftTab(direction) {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length <= 1) return void 0;
      tabs.sort((a, b) => a.index - b.index);
      const arrayPos = tabs.findIndex((t) => t.active);
      if (arrayPos === -1) return void 0;
      let nextPos = (arrayPos + direction + tabs.length) % tabs.length;
      for (let attempts = 0; attempts < tabs.length; attempts++) {
        const targetTab = tabs[nextPos];
        if (!isSkippableTab(targetTab.url)) {
          await chrome.tabs.update(targetTab.id, { active: true });
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
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
      });
    }, 50);
  }
  chrome.runtime.onMessage.addListener((message, sender) => {
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
            if (tabId !== void 0) await chrome.tabs.remove(tabId);
            break;
          }
          case "RELOAD_TAB": {
            if (tabId !== void 0) await chrome.tabs.reload(tabId);
            break;
          }
          case "UNDO_CLOSE": {
            const recent = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
            if (recent.length > 0) {
              const sessionId = recent[0].tab?.sessionId ?? recent[0].window?.sessionId;
              if (sessionId) await chrome.sessions.restore(sessionId);
            }
            break;
          }
          case "MUTE_TAB": {
            if (tabId === void 0) break;
            const tab = await chrome.tabs.get(tabId);
            await chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
            break;
          }
          case "DISCARD_TAB": {
            const tabsToDiscard = await chrome.tabs.query({
              currentWindow: true,
              active: false,
              pinned: false,
              discarded: false
            });
            for (const tab of tabsToDiscard) {
              if (tab.id === void 0) continue;
              const url = tab.url ?? "";
              if (isSkippableTab(url)) continue;
              try {
                chrome.tabs.sendMessage(tab.id, { command: "MARK_SLEEPING" }).catch(() => {
                });
                await new Promise((r) => setTimeout(r, 30));
                await chrome.tabs.discard(tab.id);
              } catch (e) {
                console.warn(`[X-Ops Walker] discard(${tab.id}) skipped:`, e);
              }
            }
            break;
          }
          case "GO_FIRST_TAB": {
            const allTabs = await chrome.tabs.query({ currentWindow: true });
            allTabs.sort((a, b) => a.index - b.index);
            if (allTabs[0]?.id !== void 0) {
              await chrome.tabs.update(allTabs[0].id, { active: true });
              sendArrivalBlur(allTabs[0].id);
            }
            break;
          }
          case "DUPLICATE_TAB": {
            if (tabId !== void 0) await chrome.tabs.duplicate(tabId);
            break;
          }
          case "CLEAN_UP": {
            const tabsToKill = await chrome.tabs.query({
              currentWindow: true,
              active: false,
              pinned: false
            });
            const targetIds = tabsToKill.map((t) => t.id).filter((id) => id !== void 0);
            if (targetIds.length > 0) {
              await chrome.tabs.remove(targetIds);
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
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "walker-keepalive") return;
    port.onDisconnect.addListener(() => {
    });
  });
})();
