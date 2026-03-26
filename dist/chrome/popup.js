"use strict";
(() => {
  // src/config/state.ts
  var DEFAULT_PHANTOM_STATE = {
    master: true,
    xWalker: {
      enabled: true,
      rightColumnDashboard: true,
      // 【追加】違反4解消: デフォルト値のハードコード排除
      skipReposts: true,
      skipAds: true,
      scrollOffset: -150,
      colors: {
        recent: "#00ba7c",
        old: "#ffd400",
        ancient: "#f4212e",
        copied: "rgba(0, 255, 255, 0.2)"
      },
      zenOpacity: 0.5
    },
    // 【v2.3追加】Gemini Walker デフォルト設定
    geminiWalker: {
      enabled: true
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

  // src/popup.ts
  function t(key, subs) {
    return chrome.i18n.getMessage(key, subs) || key;
  }
  function updateUI(active) {
    const toggle = document.getElementById("toggle");
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");
    const detail = document.getElementById("status-detail");
    if (active) {
      toggle.classList.add("active");
      toggle.setAttribute("aria-checked", "true");
      statusText.textContent = t("popup_status_on");
      statusText.className = "on";
      statusDot.className = "on";
      detail.textContent = t("popup_detail_on");
    } else {
      toggle.classList.remove("active");
      toggle.setAttribute("aria-checked", "false");
      statusText.textContent = t("popup_status_off");
      statusText.className = "off";
      statusDot.className = "off";
      detail.textContent = t("popup_detail_off");
    }
    const domainContainer = document.getElementById("domain-protocol-container");
    if (domainContainer) {
      if (active) {
        domainContainer.classList.remove("disabled-section");
      } else {
        domainContainer.classList.add("disabled-section");
      }
    }
  }
  function updatePhantomCascadeUI(master) {
    const subContainer = document.getElementById("phantom-sub-container");
    if (subContainer) {
      if (master) {
        subContainer.classList.remove("disabled-section");
      } else {
        subContainer.classList.add("disabled-section");
      }
    }
  }
  function updateBlockerUI(active) {
    const toggle = document.getElementById("blocker-toggle");
    if (active) {
      toggle.classList.add("active");
      toggle.setAttribute("aria-checked", "true");
    } else {
      toggle.classList.remove("active");
      toggle.setAttribute("aria-checked", "false");
    }
  }
  function updateMiniToggle(elementId, active) {
    const toggle = document.getElementById(elementId);
    if (active) {
      toggle.classList.add("active");
      toggle.setAttribute("aria-checked", "true");
    } else {
      toggle.classList.remove("active");
      toggle.setAttribute("aria-checked", "false");
    }
  }
  function updateDynamicDomainBtn(btn, domain, isMonitored) {
    if (isMonitored) {
      btn.textContent = t("popup_already_monitored", domain);
      btn.classList.add("active");
    } else {
      btn.textContent = t("popup_add_to_alm", domain);
      btn.classList.remove("active");
    }
  }
  function applyI18n() {
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) {
        const message = t(key);
        if (message && message !== key) {
          if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.placeholder = message;
          } else {
            el.textContent = message;
          }
        }
      }
    });
  }
  async function init() {
    const manifest = chrome.runtime.getManifest();
    const versionBadge = document.getElementById("version-badge");
    if (versionBadge) versionBadge.textContent = `v${manifest.version}`;
    applyI18n();
    const footer = document.getElementById("footer");
    if (footer) footer.title = t("popup_footer_hint");
    const almSafetyRow = document.getElementById("alm-safety-row");
    if (almSafetyRow) almSafetyRow.title = t("popup_safety_enter_desc");
    const scHint = document.getElementById("sc-hint");
    const beforeText = document.createTextNode(t("popup_sc_hint_before") + " ");
    const keyBadge = document.createElement("span");
    keyBadge.className = "key-badge";
    keyBadge.textContent = "F";
    const afterText = document.createTextNode(" " + t("popup_sc_hint_after"));
    scHint.appendChild(beforeText);
    scHint.appendChild(keyBadge);
    scHint.appendChild(afterText);
    const result = await chrome.storage.local.get(["global", "phantom", "alm"]);
    const globalState = result.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
    let phantomState = result.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
    if (phantomState.geminiWalker === void 0) {
      phantomState.geminiWalker = JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE.geminiWalker));
      chrome.storage.local.set({ phantom: phantomState });
    }
    updateUI(!!globalState.walkerMode);
    updateBlockerUI(!!globalState.blockOneTap);
    const rawAlm = result.alm || {};
    const almConfig = {
      enabled: rawAlm.enabled ?? true,
      excludeDomains: rawAlm.excludeDomains || rawAlm.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains
    };
    updateMiniToggle("alm-master-toggle", almConfig.enabled);
    updateMiniToggle("alm-safety-toggle", !!globalState.safetyEnter);
    updateMiniToggle("toggle-phantom-master", !!phantomState.master);
    updatePhantomCascadeUI(!!phantomState.master);
    const xWalkerConfig = phantomState.xWalker;
    if (document.getElementById("toggle-protocol-x")) {
      updateMiniToggle("toggle-protocol-x", !!xWalkerConfig.enabled);
    }
    if (document.getElementById("toggle-x-right-column")) {
      updateMiniToggle("toggle-x-right-column", !!xWalkerConfig.rightColumnDashboard);
    }
    const geminiWalkerConfig = phantomState.geminiWalker;
    if (document.getElementById("toggle-protocol-gemini")) {
      updateMiniToggle("toggle-protocol-gemini", !!geminiWalkerConfig.enabled);
    }
    const domainBtn = document.getElementById("dynamic-domain-btn");
    let currentHostname = "";
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url) {
        currentHostname = new URL(activeTab.url).hostname;
        const isMonitored = almConfig.excludeDomains.includes(currentHostname);
        updateDynamicDomainBtn(domainBtn, currentHostname, isMonitored);
        domainBtn.style.display = "block";
        const protocolX = document.getElementById("protocol-x");
        const protocolGemini = document.getElementById("protocol-gemini");
        const protocolNone = document.getElementById("protocol-none");
        if (currentHostname.includes("x.com") || currentHostname.includes("twitter.com")) {
          protocolX.style.display = "block";
        } else if (currentHostname.includes("gemini.google.com")) {
          protocolGemini.style.display = "block";
        } else {
          protocolNone.style.display = "block";
        }
      } else {
        domainBtn.style.display = "none";
        document.getElementById("protocol-none").style.display = "block";
      }
    } catch {
      domainBtn.style.display = "none";
      document.getElementById("protocol-none").style.display = "block";
    }
    document.getElementById("toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("global");
      const globalState2 = res.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
      globalState2.walkerMode = !globalState2.walkerMode;
      await chrome.storage.local.set({ global: globalState2 });
      updateUI(globalState2.walkerMode);
    });
    document.getElementById("blocker-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("global");
      const globalState2 = res.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
      globalState2.blockOneTap = !globalState2.blockOneTap;
      await chrome.storage.local.set({ global: globalState2 });
      updateBlockerUI(globalState2.blockOneTap);
    });
    document.getElementById("alm-master-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("alm");
      const raw = res.alm || {};
      const conf = {
        enabled: !(raw.enabled ?? true),
        excludeDomains: raw.excludeDomains || raw.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains
      };
      const saveObj = { ...conf };
      delete saveObj.heavyDomains;
      await chrome.storage.local.set({ alm: saveObj });
      updateMiniToggle("alm-master-toggle", conf.enabled);
    });
    document.getElementById("alm-safety-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("global");
      const globalState2 = res.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
      globalState2.safetyEnter = !globalState2.safetyEnter;
      await chrome.storage.local.set({ global: globalState2 });
      updateMiniToggle("alm-safety-toggle", globalState2.safetyEnter);
    });
    const phantomMasterToggle = document.getElementById("toggle-phantom-master");
    if (phantomMasterToggle) {
      phantomMasterToggle.addEventListener("click", async () => {
        const res = await chrome.storage.local.get("phantom");
        const phantomState2 = res.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
        phantomState2.master = !phantomState2.master;
        await chrome.storage.local.set({ phantom: phantomState2 });
        updateMiniToggle("toggle-phantom-master", phantomState2.master);
        updatePhantomCascadeUI(phantomState2.master);
      });
    }
    const protocolXToggle = document.getElementById("toggle-protocol-x");
    if (protocolXToggle) {
      protocolXToggle.addEventListener("click", async () => {
        const res = await chrome.storage.local.get("phantom");
        const phantomState2 = res.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
        phantomState2.xWalker.enabled = !phantomState2.xWalker.enabled;
        await chrome.storage.local.set({ phantom: phantomState2 });
        updateMiniToggle("toggle-protocol-x", phantomState2.xWalker.enabled);
      });
    }
    const xRightColumnToggle = document.getElementById("toggle-x-right-column");
    if (xRightColumnToggle) {
      xRightColumnToggle.addEventListener("click", async () => {
        const res = await chrome.storage.local.get("phantom");
        const phantomState2 = res.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
        phantomState2.xWalker.rightColumnDashboard = !phantomState2.xWalker.rightColumnDashboard;
        await chrome.storage.local.set({ phantom: phantomState2 });
        updateMiniToggle("toggle-x-right-column", phantomState2.xWalker.rightColumnDashboard);
      });
    }
    const geminiToggle = document.getElementById("toggle-protocol-gemini");
    if (geminiToggle) {
      geminiToggle.addEventListener("click", async () => {
        const res = await chrome.storage.local.get("phantom");
        const phantomState2 = res.phantom || JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE));
        if (!phantomState2.geminiWalker) {
          phantomState2.geminiWalker = JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE.geminiWalker));
        }
        phantomState2.geminiWalker.enabled = !phantomState2.geminiWalker.enabled;
        await chrome.storage.local.set({ phantom: phantomState2 });
        updateMiniToggle("toggle-protocol-gemini", phantomState2.geminiWalker.enabled);
      });
    }
    domainBtn.addEventListener("click", async () => {
      if (!currentHostname) return;
      const res = await chrome.storage.local.get("alm");
      const raw = res.alm || {};
      const conf = {
        enabled: raw.enabled ?? true,
        excludeDomains: raw.excludeDomains || raw.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains
      };
      const isMonitored = conf.excludeDomains.includes(currentHostname);
      if (isMonitored) {
        conf.excludeDomains = conf.excludeDomains.filter((d) => d !== currentHostname);
      } else {
        conf.excludeDomains.push(currentHostname);
      }
      const saveObj = { ...conf };
      delete saveObj.heavyDomains;
      await chrome.storage.local.set({ alm: saveObj });
      updateDynamicDomainBtn(domainBtn, currentHostname, !isMonitored);
    });
    document.getElementById("advanced-settings").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
