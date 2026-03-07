"use strict";
(() => {
  // src/options.ts
  var STORAGE_KEY_BOOKMARKS = "xOpsBookmarks";
  var STORAGE_KEY_WALKER_MODE = "isWalkerMode";
  var STORAGE_KEY_ALM = "alm";
  function cleanUrl(url) {
    try {
      let cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
      cleaned = cleaned.replace(/\/$/, "");
      return cleaned.toLowerCase().trim();
    } catch {
      return url.toLowerCase().trim();
    }
  }
  function initTabs() {
    const navItems = document.querySelectorAll(".nav-item");
    const panels = document.querySelectorAll(".panel");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const tabName = item.getAttribute("data-tab");
        navItems.forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        panels.forEach((p) => p.classList.remove("active"));
        const targetPanel = document.getElementById(`panel-${tabName}`);
        if (targetPanel) targetPanel.classList.add("active");
      });
    });
  }
  async function loadBookmarks() {
    const result = await chrome.storage.local.get(STORAGE_KEY_BOOKMARKS);
    return result[STORAGE_KEY_BOOKMARKS] || [];
  }
  async function saveBookmarks(bookmarks) {
    await chrome.storage.local.set({ [STORAGE_KEY_BOOKMARKS]: bookmarks });
    renderBookmarks();
  }
  async function renderBookmarks() {
    const bookmarks = await loadBookmarks();
    const list = document.getElementById("bookmark-list");
    list.innerHTML = "";
    bookmarks.forEach((bm, index) => {
      const li = document.createElement("li");
      li.className = "bookmark-item";
      li.innerHTML = `
            <div class="bookmark-info">
                <span class="bookmark-title">${bm.title}</span>
                <span class="bookmark-url">${bm.url}</span>
            </div>
            <div class="bookmark-actions">
                <button class="btn btn-danger" data-index="${index}">\u524A\u9664</button>
            </div>
        `;
      list.appendChild(li);
    });
    list.querySelectorAll(".btn-danger").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
        const current = await loadBookmarks();
        current.splice(index, 1);
        await saveBookmarks(current);
      });
    });
  }
  async function initQuickAdd() {
    const btnQuickAdd = document.getElementById("btn-quick-add");
    const inputTitle = document.getElementById("input-title");
    const inputUrl = document.getElementById("input-url");
    const msg = document.getElementById("quick-add-msg");
    btnQuickAdd.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab && tab.url && tab.title) {
        inputTitle.value = tab.title;
        inputUrl.value = cleanUrl(tab.url);
        inputTitle.style.borderColor = "var(--accent-blue)";
        inputUrl.style.borderColor = "var(--accent-blue)";
        setTimeout(() => {
          inputTitle.style.borderColor = "";
          inputUrl.style.borderColor = "";
        }, 1e3);
      }
    });
    document.getElementById("btn-save-bookmark").addEventListener("click", async () => {
      const title = inputTitle.value.trim();
      const url = cleanUrl(inputUrl.value.trim());
      if (!title || !url) return;
      const current = await loadBookmarks();
      current.push({ title, url });
      await saveBookmarks(current);
      inputTitle.value = "";
      inputUrl.value = "";
      msg.style.display = "block";
      setTimeout(() => {
        msg.style.display = "none";
      }, 2e3);
    });
  }
  async function initGeneralSettings() {
    const checkWalkerMode = document.getElementById("check-walker-mode");
    const checkAlmEnabled = document.getElementById("check-alm-enabled");
    const state = await chrome.storage.local.get([STORAGE_KEY_WALKER_MODE, STORAGE_KEY_ALM]);
    checkWalkerMode.checked = !!state[STORAGE_KEY_WALKER_MODE];
    checkWalkerMode.addEventListener("change", async () => {
      await chrome.storage.local.set({ [STORAGE_KEY_WALKER_MODE]: checkWalkerMode.checked });
    });
    const alm = state[STORAGE_KEY_ALM] || { enabled: true };
    checkAlmEnabled.checked = !!alm.enabled;
    checkAlmEnabled.addEventListener("change", async () => {
      const currentAlm = (await chrome.storage.local.get(STORAGE_KEY_ALM))[STORAGE_KEY_ALM] || { enabled: true };
      currentAlm.enabled = checkAlmEnabled.checked;
      await chrome.storage.local.set({ [STORAGE_KEY_ALM]: currentAlm });
    });
    const manifest = chrome.runtime.getManifest();
    document.getElementById("extension-version").textContent = `Version: ${manifest.version}`;
  }
  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initQuickAdd();
    renderBookmarks();
    initGeneralSettings();
  });
})();
