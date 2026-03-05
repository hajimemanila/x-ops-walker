"use strict";
(() => {
  // src/popup.ts
  var STORAGE_KEY = "isWalkerMode";
  var BLOCKER_KEY = "blockGoogleOneTap";
  var DEFAULT_ALM_CONFIG = {
    enabled: true,
    ahkInfection: true,
    safetyEnter: false,
    heavyDomains: [
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
  async function init() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById("version-badge").textContent = `v${manifest.version}`;
    document.getElementById("mode-label").textContent = t("popup_mode_label");
    document.getElementById("sc-title").textContent = t("popup_sc_title");
    document.getElementById("footer").textContent = t("popup_footer_hint");
    document.getElementById("blocker-label").textContent = t("popup_blocker_label");
    document.getElementById("alm-master-label").textContent = t("popup_smart_discard_label");
    document.getElementById("alm-ahk-label").textContent = t("popup_ahk_reclaim_label");
    document.getElementById("alm-safety-label").textContent = t("popup_safety_enter_label");
    document.getElementById("alm-safety-row").title = t("popup_safety_enter_desc");
    document.getElementById("advanced-settings").textContent = t("popup_advanced_settings");
    document.getElementById("protocol-x-title").textContent = t("protocol_x_title");
    document.getElementById("protocol-gemini-title").textContent = t("protocol_gemini_title");
    document.getElementById("protocol-none-msg").textContent = t("protocol_none_msg");
    const scHint = document.getElementById("sc-hint");
    const beforeText = document.createTextNode(t("popup_sc_hint_before") + " ");
    const keyBadge = document.createElement("span");
    keyBadge.className = "key-badge";
    keyBadge.textContent = "F";
    const afterText = document.createTextNode(" " + t("popup_sc_hint_after"));
    scHint.appendChild(beforeText);
    scHint.appendChild(keyBadge);
    scHint.appendChild(afterText);
    const result = await chrome.storage.local.get([STORAGE_KEY, BLOCKER_KEY, "alm"]);
    updateUI(!!result[STORAGE_KEY]);
    updateBlockerUI(!!result[BLOCKER_KEY]);
    const almConfig = result.alm ?? DEFAULT_ALM_CONFIG;
    updateMiniToggle("alm-master-toggle", almConfig.enabled);
    updateMiniToggle("alm-ahk-toggle", almConfig.ahkInfection);
    updateMiniToggle("alm-safety-toggle", !!almConfig.safetyEnter);
    const domainBtn = document.getElementById("dynamic-domain-btn");
    let currentHostname = "";
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url) {
        currentHostname = new URL(activeTab.url).hostname;
        const isMonitored = almConfig.heavyDomains.includes(currentHostname);
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
      const res = await chrome.storage.local.get(STORAGE_KEY);
      const next = !res[STORAGE_KEY];
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
      updateUI(next);
    });
    document.getElementById("blocker-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get(BLOCKER_KEY);
      const next = !res[BLOCKER_KEY];
      await chrome.storage.local.set({ [BLOCKER_KEY]: next });
      updateBlockerUI(next);
    });
    document.getElementById("alm-master-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("alm");
      const conf = res.alm ?? DEFAULT_ALM_CONFIG;
      conf.enabled = !conf.enabled;
      await chrome.storage.local.set({ alm: conf });
      updateMiniToggle("alm-master-toggle", conf.enabled);
    });
    document.getElementById("alm-ahk-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("alm");
      const conf = res.alm ?? DEFAULT_ALM_CONFIG;
      conf.ahkInfection = !conf.ahkInfection;
      await chrome.storage.local.set({ alm: conf });
      updateMiniToggle("alm-ahk-toggle", conf.ahkInfection);
    });
    document.getElementById("alm-safety-toggle").addEventListener("click", async () => {
      const res = await chrome.storage.local.get("alm");
      const conf = res.alm ?? DEFAULT_ALM_CONFIG;
      conf.safetyEnter = !conf.safetyEnter;
      await chrome.storage.local.set({ alm: conf });
      updateMiniToggle("alm-safety-toggle", !!conf.safetyEnter);
    });
    domainBtn.addEventListener("click", async () => {
      if (!currentHostname) return;
      const res = await chrome.storage.local.get("alm");
      const conf = res.alm ?? DEFAULT_ALM_CONFIG;
      const isMonitored = conf.heavyDomains.includes(currentHostname);
      if (isMonitored) {
        conf.heavyDomains = conf.heavyDomains.filter((d) => d !== currentHostname);
      } else {
        conf.heavyDomains.push(currentHostname);
      }
      await chrome.storage.local.set({ alm: conf });
      updateDynamicDomainBtn(domainBtn, currentHostname, !isMonitored);
    });
    document.getElementById("advanced-settings").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
