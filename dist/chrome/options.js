"use strict";
(() => {
  // src/options.ts
  var STORAGE_KEY_BOOKMARKS = "xOpsBookmarks";
  var STORAGE_KEY_ALM = "alm";
  var editingIndex = null;
  function updateOptionsUI(walkerMode) {
    const bookmarkPanel = document.getElementById("panel-bookmarks");
    if (bookmarkPanel) {
      if (walkerMode) {
        bookmarkPanel.classList.remove("disabled-section");
      } else {
        bookmarkPanel.classList.add("disabled-section");
      }
    }
  }
  function updatePhantomUI(master) {
    const subSettings = document.getElementById("phantom-sub-settings");
    if (subSettings) {
      if (master) {
        subSettings.classList.remove("disabled-section");
      } else {
        subSettings.classList.add("disabled-section");
      }
    }
  }
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
      const isEditing = editingIndex === index;
      li.innerHTML = `
            <div class="bookmark-info" style="flex: 1; padding-right: 15px;">
                ${isEditing ? `
                    <input type="text" class="edit-input" id="edit-title-${index}" value="${bm.title.replace(/"/g, "&quot;")}" placeholder="Title">
                    <input type="text" class="edit-input" id="edit-url-${index}" value="${bm.url.replace(/"/g, "&quot;")}" placeholder="URL">
                ` : `
                    <div class="bookmark-title">${bm.title}</div>
                    <div class="bookmark-url">${bm.url}</div>
                `}
            </div>
            <div class="bookmark-actions">
                ${!isEditing ? `
                    <button class="btn btn-reorder btn-up" data-index="${index}" ${index === 0 ? "disabled" : ""}>\u2191</button>
                    <button class="btn btn-reorder btn-down" data-index="${index}" ${index === bookmarks.length - 1 ? "disabled" : ""}>\u2193</button>
                    <button class="btn btn-outline btn-edit" data-index="${index}">\u7DE8\u96C6</button>
                ` : `
                    <button class="btn btn-save" data-index="${index}">\u4FDD\u5B58</button>
                    <button class="btn btn-cancel">\u623B\u308B</button>
                `}
                <button class="btn btn-danger btn-delete" data-index="${index}">\u524A\u9664</button>
            </div>
        `;
      if (isEditing) {
        li.querySelector(".btn-save").addEventListener("click", async () => {
          const newTitle = document.getElementById(`edit-title-${index}`).value.trim();
          const newUrl = cleanUrl(document.getElementById(`edit-url-${index}`).value.trim());
          if (newTitle && newUrl) {
            const current = await loadBookmarks();
            current[index] = { title: newTitle, url: newUrl };
            editingIndex = null;
            await saveBookmarks(current);
          }
        });
        li.querySelector(".btn-cancel").addEventListener("click", () => {
          editingIndex = null;
          renderBookmarks();
        });
      } else {
        li.querySelector(".btn-edit").addEventListener("click", () => {
          editingIndex = index;
          renderBookmarks();
        });
        li.querySelector(".btn-up:not(:disabled)")?.addEventListener("click", async () => {
          const current = await loadBookmarks();
          [current[index - 1], current[index]] = [current[index], current[index - 1]];
          await saveBookmarks(current);
        });
        li.querySelector(".btn-down:not(:disabled)")?.addEventListener("click", async () => {
          const current = await loadBookmarks();
          [current[index], current[index + 1]] = [current[index + 1], current[index]];
          await saveBookmarks(current);
        });
      }
      li.querySelector(".btn-delete").addEventListener("click", async () => {
        if (confirm("\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")) {
          const current = await loadBookmarks();
          current.splice(index, 1);
          await saveBookmarks(current);
        }
      });
      list.appendChild(li);
    });
  }
  async function initQuickAdd() {
    const inputTitle = document.getElementById("input-title");
    const inputUrl = document.getElementById("input-url");
    const msg = document.getElementById("quick-add-msg");
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
    const checkBlockOneTap = document.getElementById("check-block-one-tap");
    const checkSafetyEnter = document.getElementById("check-safety-enter");
    const checkPhantomMaster = document.getElementById("check-phantom-master");
    const checkPhantomX = document.getElementById("check-phantom-x");
    const checkPhantomXDashboard = document.getElementById("check-phantom-x-dashboard");
    const state = await chrome.storage.local.get(["global", "phantom", STORAGE_KEY_ALM]);
    const globalState = state.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
    const phantomState = state.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
    checkWalkerMode.checked = !!globalState.walkerMode;
    checkBlockOneTap.checked = !!globalState.blockOneTap;
    checkSafetyEnter.checked = !!globalState.safetyEnter;
    checkPhantomMaster.checked = !!phantomState.master;
    checkPhantomX.checked = !!phantomState.xWalker?.enabled;
    checkPhantomXDashboard.checked = !!phantomState.xWalker?.rightColumnDashboard;
    updateOptionsUI(!!globalState.walkerMode);
    updatePhantomUI(!!phantomState.master);
    checkWalkerMode.addEventListener("change", async () => {
      const cur = await chrome.storage.local.get("global");
      const g = cur.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
      g.walkerMode = checkWalkerMode.checked;
      await chrome.storage.local.set({ global: g });
      updateOptionsUI(g.walkerMode);
    });
    checkBlockOneTap.addEventListener("change", async () => {
      const cur = await chrome.storage.local.get("global");
      const g = cur.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
      g.blockOneTap = checkBlockOneTap.checked;
      await chrome.storage.local.set({ global: g });
    });
    checkSafetyEnter.addEventListener("change", async () => {
      const cur = await chrome.storage.local.get("global");
      const g = cur.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
      g.safetyEnter = checkSafetyEnter.checked;
      await chrome.storage.local.set({ global: g });
    });
    checkPhantomMaster.addEventListener("change", async () => {
      const cur = await chrome.storage.local.get("phantom");
      const p = cur.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
      p.master = checkPhantomMaster.checked;
      await chrome.storage.local.set({ phantom: p });
      updatePhantomUI(p.master);
    });
    checkPhantomX.addEventListener("change", async () => {
      const cur = await chrome.storage.local.get("phantom");
      const p = cur.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
      if (!p.xWalker) p.xWalker = { enabled: true, rightColumnDashboard: true };
      p.xWalker.enabled = checkPhantomX.checked;
      await chrome.storage.local.set({ phantom: p });
    });
    checkPhantomXDashboard.addEventListener("change", async () => {
      const cur = await chrome.storage.local.get("phantom");
      const p = cur.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
      if (!p.xWalker) p.xWalker = { enabled: true, rightColumnDashboard: true };
      p.xWalker.rightColumnDashboard = checkPhantomXDashboard.checked;
      await chrome.storage.local.set({ phantom: p });
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
