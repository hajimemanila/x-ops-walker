"use strict";
(() => {
  // src/popup.ts
  function t(key) {
    return browser.i18n.getMessage(key) || key;
  }
  function updateGlobalUI(config) {
    const walkerToggle = document.getElementById("toggle");
    const statusText = document.getElementById("status-text");
    const phantomCard = document.getElementById("phantom-mode-card");
    if (config.walkerMode) {
      walkerToggle.classList.add("active");
      walkerToggle.setAttribute("aria-checked", "true");
      statusText.textContent = "ON";
      statusText.className = "on";
      phantomCard.classList.remove("disabled-section");
    } else {
      walkerToggle.classList.remove("active");
      walkerToggle.setAttribute("aria-checked", "false");
      statusText.textContent = "OFF";
      statusText.className = "off";
      phantomCard.classList.add("disabled-section");
    }
    const blockerToggle = document.getElementById("blocker-toggle");
    if (config.oneTap) {
      blockerToggle.classList.add("active");
      blockerToggle.setAttribute("aria-checked", "true");
    } else {
      blockerToggle.classList.remove("active");
      blockerToggle.setAttribute("aria-checked", "false");
    }
  }
  function updatePhantomUI(config) {
    const masterToggle = document.getElementById("phantom-master-toggle");
    const xToggle = document.getElementById("phantom-x-toggle");
    const geminiToggle = document.getElementById("phantom-gemini-toggle");
    const domainProtocols = document.getElementById("domain-protocols");
    if (config.master) {
      masterToggle.classList.add("active");
      masterToggle.setAttribute("aria-checked", "true");
      domainProtocols.classList.remove("disabled-section");
    } else {
      masterToggle.classList.remove("active");
      masterToggle.setAttribute("aria-checked", "false");
      domainProtocols.classList.add("disabled-section");
    }
    if (config.xWalker) {
      xToggle.classList.add("active");
      xToggle.setAttribute("aria-checked", "true");
    } else {
      xToggle.classList.remove("active");
      xToggle.setAttribute("aria-checked", "false");
    }
  }
  async function init() {
    const manifest = browser.runtime.getManifest();
    document.getElementById("version-badge").textContent = `v${manifest.version}`;
    document.getElementById("global-ops-title").textContent = t("global_ops_section");
    document.getElementById("walker-master-label").textContent = t("popup_mode_label") + " (Master)";
    document.getElementById("blocker-label").textContent = t("block_google_one_tap");
    document.getElementById("safety-label").textContent = t("chat_safety_enter");
    document.getElementById("phantom-mode-title").textContent = t("phantom_mode_section");
    document.getElementById("phantom-master-label").textContent = t("phantom_mode_master");
    document.getElementById("domain-protocols-title").textContent = t("domain_protocols_title");
    document.getElementById("x-timeline-label").textContent = t("x_timeline_walker");
    document.getElementById("gemini-label").textContent = t("gemini_walker");
    const result = await browser.storage.local.get(["global", "phantom"]);
    const globalConfig = result.global || {};
    const phantomConfig = result.phantom || { master: true, xWalker: true, geminiWalker: false };
    updateGlobalUI(globalConfig);
    updatePhantomUI(phantomConfig);
    document.getElementById("toggle").addEventListener("click", async () => {
      const res = await browser.storage.local.get("global");
      const config = res.global || {};
      config.walkerMode = !config.walkerMode;
      await browser.storage.local.set({ global: config });
      updateGlobalUI(config);
    });
    document.getElementById("blocker-toggle").addEventListener("click", async () => {
      const res = await browser.storage.local.get("global");
      const config = res.global || {};
      config.oneTap = !config.oneTap;
      await browser.storage.local.set({ global: config });
      updateGlobalUI(config);
    });
    document.getElementById("phantom-master-toggle").addEventListener("click", async () => {
      const res = await browser.storage.local.get("phantom");
      const config = res.phantom || {};
      config.master = !config.master;
      await browser.storage.local.set({ phantom: config });
      updatePhantomUI(config);
    });
    document.getElementById("phantom-x-toggle").addEventListener("click", async () => {
      const res = await browser.storage.local.get("phantom");
      const config = res.phantom || {};
      config.xWalker = !config.xWalker;
      await browser.storage.local.set({ phantom: config });
      updatePhantomUI(config);
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
