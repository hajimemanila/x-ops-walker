"use strict";
(() => {
  // src/popup.ts
  var STORAGE_KEY = "isWalkerMode";
  function t(key) {
    return browser.i18n.getMessage(key) || key;
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
  async function init() {
    document.getElementById("mode-label").textContent = t("popup_mode_label");
    document.getElementById("sc-title").textContent = t("popup_sc_title");
    document.getElementById("footer").textContent = t("popup_footer_hint");
    const scHint = document.getElementById("sc-hint");
    scHint.innerHTML = t("popup_sc_hint_before") + ' <span class="key-badge">F</span> ' + t("popup_sc_hint_after");
    const result = await browser.storage.local.get(STORAGE_KEY);
    updateUI(!!result[STORAGE_KEY]);
    document.getElementById("toggle").addEventListener("click", async () => {
      const res = await browser.storage.local.get(STORAGE_KEY);
      const next = !res[STORAGE_KEY];
      await browser.storage.local.set({ [STORAGE_KEY]: next });
      updateUI(next);
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
