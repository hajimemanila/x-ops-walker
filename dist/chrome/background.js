"use strict";
(() => {
  // src/config/state.ts
  var DEFAULT_GLOBAL_STATE = {
    walkerMode: true,
    blockOneTap: false,
    safetyEnter: false
  };
  var DEFAULT_PHANTOM_STATE = {
    master: true,
    xWalker: {
      enabled: true,
      rightColumnDashboard: true
    }
  };
  var DEFAULT_ALM_CONFIG = {
    enabled: true,
    excludeDomains: [
      "x.com",
      "twitter.com",
      "gemini.google.com",
      "chatgpt.com",
      "claude.ai",
      "chat.deepseek.com",
      "copilot.microsoft.com",
      "perplexity.ai",
      "grok.com",
      "figma.com",
      "canva.com",
      "notion.so",
      "www.youtube.com"
    ]
  };

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
    try {
      const result = await chrome.storage.local.get(null);
      let needsUpdate = false;
      const globalState = result.global || { ...DEFAULT_GLOBAL_STATE };
      const phantomState = result.phantom || { ...DEFAULT_PHANTOM_STATE };
      if ("isWalkerMode" in result) {
        globalState.walkerMode = result.isWalkerMode;
        needsUpdate = true;
      }
      if ("blockGoogleOneTap" in result) {
        globalState.blockOneTap = result.blockGoogleOneTap;
        needsUpdate = true;
      }
      if (result.alm && "safetyEnter" in result.alm) {
        globalState.safetyEnter = result.alm.safetyEnter;
        needsUpdate = true;
      }
      if ("xWalker" in result && !result.phantom) {
        phantomState.xWalker = result.xWalker;
        needsUpdate = true;
      }
      if (needsUpdate || !result.global || !result.phantom) {
        await chrome.storage.local.set({
          global: globalState,
          phantom: phantomState
        });
        await chrome.storage.local.remove(["isWalkerMode", "blockGoogleOneTap"]);
        console.log("[X-Ops Walker] Phantom State Migration Complete.");
      }
    } catch (e) {
      console.error("[X-Ops Walker] Migration error:", e);
    }
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
          // ── ALM v1.3.0: Kernel からの状態通知 ────────────────────────────────
          case "ALM_VETO": {
            if (tabId === void 0) break;
            const state = almStates.get(tabId);
            if (state) {
              state.veto = true;
            } else {
              almStates.set(tabId, { inactiveAt: null, isExcluded: false, veto: true });
            }
            saveAlmStatesToStorage();
            break;
          }
          case "ALM_VETO_CLEAR": {
            if (tabId === void 0) break;
            const vetoState = almStates.get(tabId);
            if (vetoState) {
              vetoState.veto = false;
              vetoState.inactiveAt = Date.now();
            }
            saveAlmStatesToStorage();
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
  var ALM_EXCLUDE_DOMAINS = new Set(DEFAULT_ALM_CONFIG.excludeDomains);
  var currentAlmConfig = {
    enabled: true,
    excludeDomains: Array.from(ALM_EXCLUDE_DOMAINS)
  };
  var isAlmConfigLoaded = false;
  var configLoadPromise = new Promise((resolve) => {
    chrome.storage.local.get("alm", (res) => {
      if (res.alm) {
        const loadedDomains = res.alm.excludeDomains || res.alm.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains;
        currentAlmConfig = res.alm;
        currentAlmConfig.excludeDomains = loadedDomains;
        ALM_EXCLUDE_DOMAINS = new Set(loadedDomains);
        if (currentAlmConfig.enabled) {
          chrome.alarms.create("alm-master-timer", { periodInMinutes: 1 });
        } else {
          chrome.alarms.clear("alm-master-timer");
        }
      } else {
        chrome.alarms.create("alm-master-timer", { periodInMinutes: 1 });
      }
      isAlmConfigLoaded = true;
      resolve();
    });
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.alm) {
      const newConf = changes.alm.newValue;
      if (!newConf) return;
      const wasEnabled = currentAlmConfig.enabled;
      const newDomains = newConf.excludeDomains || newConf.heavyDomains || [];
      currentAlmConfig = {
        enabled: Boolean(newConf.enabled),
        excludeDomains: newDomains
      };
      ALM_EXCLUDE_DOMAINS = new Set(newDomains);
      if (wasEnabled && !newConf.enabled) {
        console.debug("[ALM] Master Timer Disabled via UI");
        chrome.alarms.clear("alm-master-timer");
      } else if (!wasEnabled && newConf.enabled) {
        console.debug("[ALM] Master Timer Enabled via UI");
        chrome.alarms.create("alm-master-timer", { periodInMinutes: 1 });
      }
    }
  });
  var ALM_GRACE_STANDARD_MS = 8 * 60 * 1e3;
  var ALM_GRACE_STANDARD_OVERLOADED_MS = 5 * 60 * 1e3;
  var ALM_OVERLOAD_THRESHOLD = 30;
  var almStates = /* @__PURE__ */ new Map();
  async function saveAlmStatesToStorage() {
    try {
      const statesObj = Object.fromEntries(almStates);
      await chrome.storage.local.set({ alm_tab_states: statesObj });
    } catch (e) {
      console.warn("[ALM] saveAlmStatesToStorage error:", e);
    }
  }
  async function loadAlmStatesFromStorage() {
    try {
      const res = await chrome.storage.local.get("alm_tab_states");
      if (res.alm_tab_states) {
        for (const [key, value] of Object.entries(res.alm_tab_states)) {
          almStates.set(Number(key), value);
        }
        return true;
      }
    } catch (e) {
      console.warn("[ALM] loadAlmStatesFromStorage error:", e);
    }
    return false;
  }
  async function initializeAlmStates() {
    await loadAlmStatesFromStorage();
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    for (const tab of tabs) {
      if (tab.id === void 0) continue;
      if (!almStates.has(tab.id) && !tab.active) {
        let isExcluded = false;
        try {
          if (tab.url) isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(tab.url).hostname);
        } catch {
        }
        almStates.set(tab.id, { inactiveAt: now, isExcluded, veto: false });
      }
    }
    saveAlmStatesToStorage();
  }
  initializeAlmStates();
  chrome.tabs.onRemoved.addListener((tabId) => {
    almStates.delete(tabId);
    saveAlmStatesToStorage();
  });
  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id === void 0 || tab.active) return;
    let isExcluded = false;
    try {
      if (tab.url) isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(tab.url).hostname);
    } catch {
    }
    almStates.set(tab.id, { inactiveAt: Date.now(), isExcluded, veto: false });
    saveAlmStatesToStorage();
  });
  async function executeStrategicHibernation(tabId, state) {
    try {
      const liveTab = await chrome.tabs.get(tabId);
      if (liveTab.active) return;
      if (liveTab.discarded) return;
      if (liveTab.pinned) return;
      if (isSkippableTab(liveTab.url)) return;
      chrome.tabs.sendMessage(tabId, { command: "MARK_SLEEPING" }).catch(() => {
      });
      await new Promise((r) => setTimeout(r, 30));
      await chrome.tabs.discard(tabId);
      console.debug(`[ALM] Smart Tab Discard executed: tabId=${tabId} excluded=${state.isExcluded}`);
    } catch (e) {
      console.debug(`[ALM] Hibernation skipped (tab gone): tabId=${tabId}`, e);
    }
  }
  async function scanAndHibernate() {
    if (!isAlmConfigLoaded) await configLoadPromise;
    if (!currentAlmConfig.enabled) return;
    if (almStates.size === 0) {
      await loadAlmStatesFromStorage();
    }
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const totalTabCount = allTabs.length;
      const isOverloaded = totalTabCount > ALM_OVERLOAD_THRESHOLD;
      const standardGrace = isOverloaded ? ALM_GRACE_STANDARD_OVERLOADED_MS : ALM_GRACE_STANDARD_MS;
      const now = Date.now();
      for (const [tabId, state] of almStates) {
        if (state.inactiveAt === null) continue;
        if (state.veto || state.isExcluded) continue;
        const elapsed = now - state.inactiveAt;
        if (elapsed >= standardGrace) {
          almStates.delete(tabId);
          saveAlmStatesToStorage();
          executeStrategicHibernation(tabId, state);
        }
      }
    } catch (e) {
      console.warn("[ALM] scanAndHibernate error:", e);
    }
  }
  var windowActiveTabs = /* @__PURE__ */ new Map();
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const prevTabId = windowActiveTabs.get(activeInfo.windowId);
    windowActiveTabs.set(activeInfo.windowId, activeInfo.tabId);
    const newState = almStates.get(activeInfo.tabId) ?? { inactiveAt: null, isExcluded: false, veto: false };
    newState.inactiveAt = null;
    almStates.set(activeInfo.tabId, newState);
    if (prevTabId !== void 0) {
      try {
        const prevTab = await chrome.tabs.get(prevTabId);
        const isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(prevTab.url ?? "").hostname);
        const prevState = almStates.get(prevTabId) ?? { inactiveAt: Date.now(), isExcluded, veto: false };
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
      } catch {
      }
    }
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "alm-master-timer") {
      scanAndHibernate();
    }
  });
})();
