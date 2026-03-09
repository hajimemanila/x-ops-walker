"use strict";
(() => {
  // src/router.ts
  var WalkerRouter = class {
    protocols = [];
    baseProtocol;
    constructor(base) {
      this.baseProtocol = base;
    }
    /** ドメイン固有のプロトコルを登録 */
    register(protocol) {
      this.protocols.push(protocol);
    }
    /** Kernel からディスパッチされるエントリーポイント */
    dispatch(event, key, shift, container) {
      const hostname = window.location.hostname;
      for (const protocol of this.protocols) {
        if (protocol.matches(hostname)) {
          if (protocol.handleKey(event, key, shift, container)) {
            return;
          }
        }
      }
      this.baseProtocol.handleKey(event, key, shift, container);
    }
  };

  // src/protocols/base.ts
  var BaseProtocol = class {
    matches(hostname) {
      return true;
    }
    handleKey(event, key, shift, container) {
      if (shift) {
        switch (key) {
          // タブ・ウィンドウ操作（backgroundへ委譲）
          case "x":
            chrome.runtime.sendMessage({ command: "CLOSE_TAB" });
            return true;
          case "z":
            chrome.runtime.sendMessage({ command: "UNDO_CLOSE" });
            return true;
          case "r":
            chrome.runtime.sendMessage({ command: "RELOAD_TAB" });
            return true;
          case "m":
            chrome.runtime.sendMessage({ command: "MUTE_TAB" });
            return true;
          case "g":
            chrome.runtime.sendMessage({ command: "DISCARD_TAB" });
            return true;
          case "t":
            chrome.runtime.sendMessage({ command: "CLEAN_UP" });
            return true;
          case "9":
            chrome.runtime.sendMessage({ command: "GO_FIRST_TAB" });
            return true;
          case "c":
            chrome.runtime.sendMessage({ command: "DUPLICATE_TAB" });
            return true;
          // スクロール操作 (ページ先頭・末尾へ直行)
          case "w":
            window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
            container.scrollTo({ top: 0, behavior: "smooth" });
            return true;
          case "s":
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            return true;
          // ナビゲーション (Shift + Space: 前タブ)
          case " ":
            chrome.runtime.sendMessage({ command: "PREV_TAB" });
            return true;
        }
        return false;
      }
      switch (key) {
        // スクロール操作 (画面の80%分)
        case "w":
          container.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
          return true;
        case "s":
          container.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
          return true;
        // ナビゲーション (タブ移動)
        case "a":
          chrome.runtime.sendMessage({ command: "PREV_TAB" });
          return true;
        case "d":
          chrome.runtime.sendMessage({ command: "NEXT_TAB" });
          return true;
        case " ":
          chrome.runtime.sendMessage({ command: "NEXT_TAB" });
          return true;
        // 履歴ナビゲーション
        case "q":
          window.history.back();
          return true;
        case "e":
          window.history.forward();
          return true;
        // ピン留め等 (元コードではFはチートシートでしたが、プロトコル分離で参照不可のため代替実装)
        case "f":
          window.dispatchEvent(new CustomEvent("XOpsWalker_ToggleCheatsheet"));
          return true;
        // フォーカス・スクロールのリセット (Z単押し)
        case "z":
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          window.focus();
          window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
          container.scrollTo({ top: 0, behavior: "smooth" });
          return true;
      }
      if (event.altKey && key === "z") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
        window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
        container.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
      return false;
    }
  };

  // src/protocols/ai-chat.ts
  var AiChatProtocol = class {
    matches(hostname) {
      return hostname.includes("gemini.google.com") || hostname.includes("chatgpt.com") || hostname.includes("claude.ai");
    }
    handleKey(event, key, shift, container) {
      if (key === "z") {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        return true;
      }
      return false;
    }
  };

  // src/protocols/x-timeline.ts
  var STORAGE_KEY_HIGHLIGHTS = "x_bookmark_highlights";
  function getHighlights() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_HIGHLIGHTS) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveHighlight(url, active) {
    const data = getHighlights();
    if (active) data[url] = true;
    else delete data[url];
    localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(data));
  }
  function cleanUrl(url) {
    if (!url) return "";
    try {
      let cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      return cleaned.toLowerCase().trim();
    } catch {
      return url.toLowerCase().trim();
    }
  }
  var isDashboardEnabled = false;
  var heartbeatId = null;
  var walkerSyncFrame = null;
  var currentUrlPath = window.location.pathname;
  var CONFIG = {
    skipReposts: true,
    skipAds: true,
    scrollOffset: -150,
    colors: { recent: "#00ba7c", old: "#ffd400", ancient: "#f4212e", copied: "rgba(0, 255, 255, 0.2)" },
    zenOpacity: 0.5,
    longPressDelay: 400
  };
  var isActive = false;
  var currentIndex = -1;
  var targetArticles = [];
  var backspaceTimer = null;
  var isBackspaceHeld = false;
  var originalTitle = "";
  var isCheatSheetVisible = false;
  function injectWalkerCSS() {
    if (document.getElementById("x-walker-style")) return;
    const style = document.createElement("style");
    style.id = "x-walker-style";
    style.textContent = `
        body.x-walker-active article[data-testid="tweet"] { opacity: ${CONFIG.zenOpacity}; transition: opacity 0.2s ease, box-shadow 0.2s ease; }
        body.x-walker-active article[data-testid="tweet"].x-walker-focused { opacity: 1 !important; background-color: rgba(255, 255, 255, 0.03); }
    `;
    if (document.head) document.head.appendChild(style);
    else document.addEventListener("DOMContentLoaded", () => document.head && document.head.appendChild(style));
  }
  function initXWalker(config) {
    isDashboardEnabled = config.enabled && config.rightColumnDashboard;
    console.log("[X-Ops Walker] \u{1F43A} X Timeline Walker Protocol Status:", isDashboardEnabled);
    setWalkerState(config.enabled);
    if (isDashboardEnabled) {
      installDashboard();
    } else {
      removeDashboard();
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if ("xWalker" in changes) {
        const newConfig = changes.xWalker.newValue;
        isDashboardEnabled = newConfig.enabled && newConfig.rightColumnDashboard;
        setWalkerState(newConfig.enabled);
        if (isDashboardEnabled) {
          installDashboard();
        } else {
          removeDashboard();
        }
      }
      if ("xOpsBookmarks" in changes && isDashboardEnabled) {
        renderBookmarkList();
      }
    }
  });
  function installDashboard() {
    removeDashboard();
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);
  }
  function removeDashboard() {
    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }
    const spacer = document.getElementById("x-ops-dashboard-spacer");
    if (spacer) spacer.remove();
    const box = document.getElementById("x-ops-dashboard-box");
    if (box) box.remove();
  }
  function maintainDOM() {
    if (!isDashboardEnabled) return;
    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith("/settings") || path.includes("/i/flow/login") || path === "/login" || path === "/logout" || path.startsWith("/i/display");
    if (isLoginModal || isExcluded) {
      const box2 = document.getElementById("x-ops-dashboard-box");
      if (box2) box2.style.display = "none";
      return;
    }
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;
    let spacer = document.getElementById("x-ops-dashboard-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.id = "x-ops-dashboard-spacer";
      spacer.style.width = "100%";
      spacer.style.height = "150px";
      spacer.style.marginTop = "12px";
      spacer.style.marginBottom = "12px";
      spacer.style.opacity = "0";
      spacer.style.pointerEvents = "none";
      spacer.style.transition = "height 0.2s ease";
    }
    const searchBar = sidebar.querySelector('[role="search"]');
    if (spacer && searchBar) {
      let target = searchBar;
      let depth = 0;
      const sidebarWrapper = sidebar.firstElementChild || sidebar;
      while (target.parentElement && target.parentElement !== sidebarWrapper && depth < 10) {
        const siblings = Array.from(target.parentElement.children).filter((el) => el.id !== "x-ops-dashboard-spacer");
        if (siblings.length > 1) {
          break;
        }
        target = target.parentElement;
        depth++;
      }
      if (target && target.parentElement && target.nextSibling !== spacer) {
        target.after(spacer);
        console.log("[X-Ops Walker] Dashboard spacer secured via Smart Pillar (depth:", depth, ")");
      }
    } else if (spacer && !spacer.isConnected) {
      const wrapper = sidebar.firstElementChild || sidebar;
      if (wrapper.firstChild !== spacer) {
        wrapper.insertBefore(spacer, wrapper.firstChild);
      }
    }
    let box = document.getElementById("x-ops-dashboard-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "x-ops-dashboard-box";
      Object.assign(box.style, {
        position: "fixed",
        zIndex: "9999",
        background: "rgba(10, 10, 22, 0.75)",
        backdropFilter: "blur(16px) saturate(180%)",
        webkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(255, 140, 0, 0.2)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        pointerEvents: "auto",
        display: "none",
        opacity: "1"
      });
      const titleText = chrome.i18n.getMessage("x_dashboard_title") || "PHANTOM OPS DASHBOARD";
      const statusText = chrome.i18n.getMessage("x_dashboard_status_ready") || "SYSTEM READY";
      box.innerHTML = `
            <style>
                #x-ops-bookmark-container::-webkit-scrollbar { width: 4px; }
                #x-ops-bookmark-container::-webkit-scrollbar-thumb { background: rgba(255, 140, 0, 0.3); border-radius: 10px; }
                .x-ops-bm-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; transition: background-color 0.2s; border-bottom: 1px solid rgba(255, 140, 0, 0.05); position: relative; }
                .x-ops-bm-item:hover { background-color: rgba(255, 255, 255, 0.03); }
                .x-ops-bm-item.target-lock { border-left: 3px solid #00ba7c; background: rgba(0, 186, 124, 0.05); }
                .x-ops-bm-item.active { background: rgba(255, 172, 48, 0.05); }
                .x-ops-bm-link { flex-grow: 1; font-size: 13px; font-weight: 500; color: #eff3f4; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .x-ops-bm-star { font-size: 16px; color: #71767b; padding: 4px; border-radius: 50%; margin-left: 8px; transition: color 0.2s; cursor: pointer; }
                .x-ops-bm-item.active .x-ops-bm-star { color: #ffac30; }
                .x-ops-bm-star:hover { color: #ffac30; background: rgba(255, 172, 48, 0.1); }
                .x-ops-bm-star.popping { animation: starPop 0.3s ease-out; }
                @keyframes starPop { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
            </style>
            <div style="padding: 10px 14px; background: rgba(255, 140, 0, 0.1); border-bottom: 1px solid rgba(255, 140, 0, 0.2); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase; user-select: none;">${titleText}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button id="x-ops-quick-add" style="background: rgba(255, 140, 0, 0.15); border: 1px solid rgba(255, 140, 0, 0.3); border-radius: 4px; color: #ffac30; font-size: 9px; font-weight: 800; padding: 2px 6px; cursor: pointer; transition: all 0.2s; font-family: 'Segoe UI', sans-serif;">[+] ADD</button>
                    <button id="x-ops-dashboard-toggle" title="\u6700\u5C0F\u5316" style="background: transparent; border: none; color: rgba(255, 255, 255, 0.6); font-size: 16px; font-weight: bold; cursor: pointer; padding: 0 4px; transition: color 0.2s; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">\u2212</button>
                </div>
            </div>
            <div id="x-ops-dashboard-content">
                <div id="x-ops-bookmark-container" style="max-height: 600px; overflow-y: auto; border-bottom: 1px solid rgba(255, 140, 0, 0.1);">
                </div>
                <div style="padding: 12px; text-align: center;">
                    <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
                </div>
            </div>
        `;
      document.body.appendChild(box);
      renderBookmarkList();
      const toggleBtn = box.querySelector("#x-ops-dashboard-toggle");
      const contentContainer = box.querySelector("#x-ops-dashboard-content");
      if (toggleBtn && contentContainer) {
        toggleBtn.addEventListener("mouseover", () => toggleBtn.style.color = "#fff");
        toggleBtn.addEventListener("mouseout", () => toggleBtn.style.color = "rgba(255, 255, 255, 0.6)");
        toggleBtn.addEventListener("click", () => {
          const isHidden = contentContainer.style.display === "none";
          if (isHidden) {
            contentContainer.style.display = "block";
            toggleBtn.textContent = "\u2212";
            toggleBtn.title = "\u6700\u5C0F\u5316";
          } else {
            contentContainer.style.display = "none";
            toggleBtn.textContent = "\uFF0B";
            toggleBtn.title = "\u5C55\u958B";
          }
        });
      }
      const quickAddBtn = box.querySelector("#x-ops-quick-add");
      if (quickAddBtn) {
        quickAddBtn.addEventListener("mouseover", () => {
          quickAddBtn.style.background = "rgba(255, 140, 0, 0.3)";
          quickAddBtn.style.boxShadow = "0 0 8px rgba(255, 140, 0, 0.4)";
        });
        quickAddBtn.addEventListener("mouseout", () => {
          quickAddBtn.style.background = "rgba(255, 140, 0, 0.15)";
          quickAddBtn.style.boxShadow = "none";
        });
        quickAddBtn.addEventListener("click", async () => {
          const url = window.location.href;
          const title = document.title.replace(/\s*\/ X$/i, "").trim();
          const clean = (u) => {
            let c = u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
            return c.toLowerCase().trim();
          };
          const cleanedUrl = clean(url);
          const result = await chrome.storage.local.get(["xOpsBookmarks"]);
          const bookmarks = result.xOpsBookmarks || [];
          if (!bookmarks.some((b) => clean(b.url) === cleanedUrl)) {
            bookmarks.push({ title: title || url, url: cleanedUrl });
            await chrome.storage.local.set({ xOpsBookmarks: bookmarks });
          }
          const originalText = quickAddBtn.innerText;
          quickAddBtn.innerText = "ADDED!";
          quickAddBtn.style.color = "#00ba7c";
          quickAddBtn.style.borderColor = "#00ba7c";
          setTimeout(() => {
            quickAddBtn.innerText = originalText;
            quickAddBtn.style.color = "#ffac30";
            quickAddBtn.style.borderColor = "rgba(255, 140, 0, 0.3)";
          }, 1e3);
        });
      }
    }
    updateTargetHighlight();
  }
  function startWalkerLoop() {
    if (walkerSyncFrame !== null) cancelAnimationFrame(walkerSyncFrame);
    function loop() {
      if (!isActive) {
        walkerSyncFrame = null;
        return;
      }
      if (currentUrlPath !== window.location.pathname) {
        currentUrlPath = window.location.pathname;
        triggerAutoTargeting();
      }
      maintainFocusVisuals();
      if (isDashboardEnabled) syncDashboardUI();
      walkerSyncFrame = requestAnimationFrame(loop);
    }
    walkerSyncFrame = requestAnimationFrame(loop);
  }
  function getArticleColor(article) {
    const t2 = article.querySelector("time");
    if (!t2) return CONFIG.colors.recent;
    const d = ((/* @__PURE__ */ new Date()).getTime() - new Date(t2.getAttribute("datetime") || "").getTime()) / 864e5;
    return d >= 30 ? CONFIG.colors.ancient : d >= 4 ? CONFIG.colors.old : CONFIG.colors.recent;
  }
  function maintainFocusVisuals() {
    if (currentIndex === -1 || targetArticles.length === 0) return;
    const target = targetArticles[currentIndex];
    if (!target || !target.isConnected) return;
    if (!target.classList.contains("x-walker-focused")) {
      target.classList.add("x-walker-focused");
    }
    const color = getArticleColor(target);
    const expectedShadow = `-4px 0 0 0 ${color}, 0 0 20px ${color}33`;
    if (target.style.boxShadow !== expectedShadow) {
      target.style.boxShadow = expectedShadow;
    }
  }
  function syncDashboardUI() {
    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith("/settings") || path.includes("/i/flow/login") || path === "/login" || path === "/logout" || path.startsWith("/i/display");
    const box = document.getElementById("x-ops-dashboard-box");
    if (isLoginModal || isExcluded) {
      if (box && box.style.display !== "none") box.style.display = "none";
      return;
    }
    const spacer = document.getElementById("x-ops-dashboard-spacer");
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (spacer && box && sidebar && spacer.isConnected) {
      if (box.style.display !== "block") box.style.display = "block";
      const spacerRect = spacer.getBoundingClientRect();
      const boxHeight = box.offsetHeight;
      const newSpacerHeight = boxHeight + 10 + "px";
      if (spacer.style.height !== newSpacerHeight) spacer.style.height = newSpacerHeight;
      if (spacerRect.width > 0) {
        const newWidth = spacerRect.width + "px";
        if (box.style.width !== newWidth) box.style.width = newWidth;
        const newLeft = spacerRect.left + "px";
        if (box.style.left !== newLeft) box.style.left = newLeft;
      } else if (!box.style.left) {
        const sidebarRect = sidebar.getBoundingClientRect();
        box.style.left = sidebarRect.left + "px";
        box.style.width = sidebarRect.width + "px";
      }
      let newTop = "";
      const searchBar = sidebar.querySelector('[role="search"]');
      if (searchBar) {
        const searchRect = searchBar.getBoundingClientRect();
        newTop = searchRect.bottom + 12 + "px";
      } else {
        newTop = Math.max(spacerRect.top, 53) + "px";
      }
      if (box.style.top !== newTop) box.style.top = newTop;
    } else if (box) {
      if (box.style.display !== "none") box.style.display = "none";
    }
  }
  function triggerAutoTargeting() {
    let attempts = 0;
    const initFocusInterval = setInterval(() => {
      updateTargets();
      if (targetArticles.length > 0) {
        clearInterval(initFocusInterval);
        setTimeout(() => {
          if (!isActive) return;
          updateTargets();
          if (window.scrollY < 200) {
            focusArticle(0);
          } else {
            findClosestIndex();
            if (currentIndex !== -1) focusArticle(currentIndex);
          }
        }, 300);
      } else if (++attempts > 40) {
        clearInterval(initFocusInterval);
      }
    }, 50);
  }
  async function renderBookmarkList() {
    const container = document.getElementById("x-ops-bookmark-container");
    if (!container) return;
    const result = await chrome.storage.local.get(["xOpsBookmarks"]);
    const bookmarks = result.xOpsBookmarks || [];
    container.innerHTML = "";
    const profileUrl = getMyProfileUrl();
    container.appendChild(createBookmarkItem("My Profile (\u81EA\u5206\u306E\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB)", profileUrl));
    bookmarks.forEach((bm) => {
      container.appendChild(createBookmarkItem(bm.title, bm.url));
    });
    updateTargetHighlight();
  }
  function getMyProfileUrl() {
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    return profileLink ? profileLink.href : "https://x.com/home";
  }
  function createBookmarkItem(title, url) {
    const item = document.createElement("div");
    item.className = "x-ops-bm-item";
    const star = document.createElement("span");
    star.className = "x-ops-bm-star";
    star.textContent = "\u2606";
    const absoluteUrl = url.startsWith("http") ? url : "https://" + url;
    item.onclick = (e) => {
      if (e.target === star) return;
      window.location.href = absoluteUrl;
    };
    const link = document.createElement("a");
    link.className = "x-ops-bm-link";
    link.textContent = title;
    link.href = absoluteUrl;
    link.onclick = (e) => e.preventDefault();
    const highlights = getHighlights();
    const cleanUrlStr = cleanUrl(url);
    const isActiveHighlight = highlights[cleanUrlStr];
    if (isActiveHighlight) {
      item.classList.add("active");
    }
    star.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const myProfileUrl = cleanUrl(getMyProfileUrl());
      if (cleanUrlStr === myProfileUrl) return;
      const newState = item.classList.toggle("active");
      saveHighlight(cleanUrlStr, newState);
      star.classList.remove("popping");
      void star.offsetWidth;
      star.classList.add("popping");
    };
    item.appendChild(link);
    item.appendChild(star);
    return item;
  }
  function updateTargetHighlight() {
    const container = document.getElementById("x-ops-bookmark-container");
    if (!container) return;
    const currentClean = cleanUrl(window.location.href);
    const items = container.querySelectorAll(".x-ops-bm-item");
    items.forEach((item) => {
      const link = item.querySelector(".x-ops-bm-link");
      if (link && cleanUrl(link.getAttribute("href") || "") === currentClean) {
        item.classList.add("target-lock");
      } else {
        item.classList.remove("target-lock");
      }
    });
  }
  function isInputActive() {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    return ["INPUT", "TEXTAREA"].includes(activeEl.tagName) || activeEl.isContentEditable;
  }
  window.addEventListener("keydown", (e) => {
    if (isInputActive()) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    if (isCheatSheetVisible && e.code !== "KeyH") {
      e.preventDefault();
      toggleCheatSheet();
      return;
    }
    if (e.code === "KeyH") {
      if (!isActive && !isDashboardEnabled) return;
      e.preventDefault();
      toggleCheatSheet();
      return;
    }
    if (isDashboardEnabled && ["KeyN", "KeyM", "KeyY"].includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "KeyN") window.dispatchEvent(new CustomEvent("x-ops-toggle-star"));
      if (e.code === "KeyM") window.dispatchEvent(new CustomEvent("x-ops-next-star"));
      if (e.code === "KeyY") window.dispatchEvent(new CustomEvent("x-ops-go-profile"));
      return;
    }
    if (isActive && ["KeyJ", "KeyK", "KeyL", "KeyO", "Backspace"].includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "KeyK") {
        resyncCurrentIndex();
        focusArticle(currentIndex - 1);
      }
      if (e.code === "KeyJ") {
        resyncCurrentIndex();
        focusArticle(currentIndex + 1);
      }
      if (e.code === "KeyL") {
        executeAction("like");
      }
      if (e.code === "KeyO") {
        executeAction("repost");
      }
      if (e.code === "Backspace") {
        if (e.repeat) return;
        startDRSDelete();
      }
      return;
    }
  }, true);
  window.addEventListener("keyup", (e) => {
    if (!isActive) return;
    if (isInputActive()) return;
    if (e.code === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      isBackspaceHeld = false;
      if (backspaceTimer !== null) {
        clearTimeout(backspaceTimer);
        backspaceTimer = null;
      }
      if (document.title === "\u26A0\uFE0F DRS ACTIVE \u26A0\uFE0F") {
        document.title = originalTitle;
      }
    }
  }, true);
  window.addEventListener("x-ops-toggle-star", () => {
    const currentUrl = window.location.href;
    const currentClean = cleanUrl(currentUrl);
    const box = document.getElementById("x-ops-dashboard-box");
    if (!box) return;
    const items = Array.from(box.querySelectorAll(".x-ops-bm-item"));
    const targetItem = items.find((item) => cleanUrl(item.querySelector(".x-ops-bm-link")?.getAttribute("href") || "") === currentClean);
    if (targetItem) {
      const star = targetItem.querySelector(".x-ops-bm-star");
      star?.click();
    }
  });
  window.addEventListener("x-ops-next-star", () => {
    const box = document.getElementById("x-ops-dashboard-box");
    if (!box) return;
    const links = Array.from(box.querySelectorAll(".x-ops-bm-link"));
    if (links.length === 0) return;
    const targets = links.map((a) => a.href);
    const highlights = getHighlights();
    const currentPath = cleanUrl(window.location.href);
    const myProfilePath = cleanUrl(getMyProfileUrl());
    let currentIdx = targets.findIndex((url) => cleanUrl(url) === currentPath);
    let nextUrl = null;
    if (currentIdx !== -1 && highlights[cleanUrl(targets[currentIdx])]) {
      let i = 1;
      while (i < targets.length) {
        let candidateIdx = (currentIdx + i) % targets.length;
        let candidateUrl = targets[candidateIdx];
        if (cleanUrl(candidateUrl) !== myProfilePath) {
          nextUrl = candidateUrl;
          break;
        }
        i++;
      }
    } else {
      let starredIdx = targets.findIndex((url) => highlights[cleanUrl(url)]);
      if (starredIdx !== -1) {
        nextUrl = targets[starredIdx];
      } else {
        let i = 1;
        while (i < targets.length) {
          let candidateIdx = (Math.max(0, currentIdx) + i) % targets.length;
          let candidateUrl = targets[candidateIdx];
          if (cleanUrl(candidateUrl) !== myProfilePath) {
            nextUrl = candidateUrl;
            break;
          }
          i++;
        }
      }
    }
    if (nextUrl && cleanUrl(nextUrl) !== currentPath) {
      let modified = false;
      if (currentIdx !== -1) {
        const originUrl = targets[currentIdx];
        if (cleanUrl(originUrl) !== myProfilePath && highlights[cleanUrl(originUrl)]) {
          delete highlights[cleanUrl(originUrl)];
          modified = true;
        }
      }
      if (cleanUrl(nextUrl) !== myProfilePath && !highlights[cleanUrl(nextUrl)]) {
        highlights[cleanUrl(nextUrl)] = true;
        modified = true;
      }
      if (modified) {
        localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(highlights));
      }
      window.location.href = nextUrl;
    }
  });
  window.addEventListener("x-ops-go-profile", () => {
    window.location.href = getMyProfileUrl();
  });
  window.addEventListener("x-ops-global-reset", () => {
    if (!isActive) return;
    forceClearFocus();
    currentIndex = -1;
  });
  function setWalkerState(enabled) {
    if (isActive === enabled) return;
    isActive = enabled;
    if (window.PhantomUI) {
      window.PhantomUI.update(enabled);
    }
    if (isActive) {
      injectWalkerCSS();
      document.body.classList.add("x-walker-active");
      startWalkerLoop();
      triggerAutoTargeting();
    } else {
      document.body.classList.remove("x-walker-active");
      forceClearFocus();
      currentIndex = -1;
      targetArticles = [];
    }
  }
  function forceClearFocus() {
    document.querySelectorAll(".x-walker-focused").forEach((el) => {
      el.classList.remove("x-walker-focused");
      el.style.boxShadow = "";
    });
  }
  function findClosestIndex() {
    if (targetArticles.length === 0) return;
    let minDiff = Infinity;
    let bestIdx = 0;
    const center = window.scrollY + window.innerHeight * 0.2;
    targetArticles.forEach((article, i) => {
      if (!article.isConnected) return;
      const rect = article.getBoundingClientRect();
      const diff = Math.abs(center - (window.scrollY + rect.top + rect.height / 2));
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    });
    currentIndex = bestIdx;
  }
  function updateTargets() {
    if (document.hidden) {
      targetArticles = [];
      return;
    }
    targetArticles = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).filter((article) => {
      if (!article.isConnected) return false;
      const text = article.innerText;
      if (CONFIG.skipAds) {
        const isOwnPromotable = article.querySelector('a[href*="/quick_promote_web/"]');
        const hasAdText = text.includes("\u30D7\u30ED\u30E2\u30FC\u30B7\u30E7\u30F3") || text.includes("Promoted");
        if (hasAdText && !isOwnPromotable) {
          return false;
        }
      }
      if (CONFIG.skipReposts && article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/リポスト|Reposted/)) return false;
      return true;
    });
  }
  function resyncCurrentIndex() {
    const focused = document.querySelector(".x-walker-focused");
    if (focused?.isConnected) {
      updateTargets();
      const newIdx = targetArticles.indexOf(focused);
      if (newIdx !== -1) {
        if (currentIndex !== newIdx) currentIndex = newIdx;
      } else findClosestIndex();
    } else if (isActive && currentIndex !== -1) findClosestIndex();
  }
  function focusArticle(index) {
    if (!isActive || document.hidden) return;
    updateTargets();
    if (index < 0) {
      window.scrollBy(0, -window.innerHeight * 1.5);
      setTimeout(() => {
        updateTargets();
        findClosestIndex();
      }, 300);
      return;
    }
    if (targetArticles.length === 0 || index >= targetArticles.length) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      setTimeout(() => {
        updateTargets();
        if (index < targetArticles.length) focusArticle(index);
      }, 1500);
      return;
    }
    forceClearFocus();
    currentIndex = index;
    const target = targetArticles[index];
    if (target?.isConnected) {
      const rect = target.getBoundingClientRect();
      window.scrollTo({ top: window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2 - CONFIG.scrollOffset, behavior: "smooth" });
    } else {
      findClosestIndex();
    }
  }
  function flashFeedback(article, color) {
    if (!article?.isConnected) return;
    const originalBg = article.style.backgroundColor;
    article.style.backgroundColor = color;
    setTimeout(() => {
      if (article.isConnected) article.style.backgroundColor = originalBg;
    }, 200);
  }
  function waitAndClick(selector, callback) {
    let attempts = 0;
    const interval = setInterval(() => {
      const el = typeof selector === "function" ? selector() : document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        el.click();
        callback?.(el);
      } else if (++attempts > 40) clearInterval(interval);
    }, 50);
  }
  function executeAction(actionType) {
    if (!isActive) return;
    resyncCurrentIndex();
    const article = targetArticles[currentIndex];
    if (!article?.isConnected) return;
    if (actionType === "like") {
      const btn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
      if (btn) btn.click();
      else flashFeedback(article, "rgba(249, 24, 128, 0.1)");
    } else if (actionType === "repost") {
      const btn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
      if (btn) {
        btn.click();
        waitAndClick(btn.getAttribute("data-testid") === "retweet" ? '[data-testid="retweetConfirm"]' : '[data-testid="unretweetConfirm"]', () => flashFeedback(article, "rgba(0, 186, 124, 0.1)"));
      }
    }
  }
  function startDRSDelete() {
    isBackspaceHeld = true;
    resyncCurrentIndex();
    const article = targetArticles[currentIndex];
    if (!article) return;
    originalTitle = document.title;
    document.title = "\u26A0\uFE0F DRS ACTIVE \u26A0\uFE0F";
    const caret = article.querySelector('[data-testid="caret"]');
    if (caret) caret.click();
    setTimeout(() => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) return;
      const deleteItems = Array.from(menu.querySelectorAll('[role="menuitem"]'));
      const deleteItem = deleteItems.find((el) => el.textContent?.match(/削除|Delete/));
      if (deleteItem) deleteItem.click();
    }, 100);
    backspaceTimer = window.setTimeout(() => {
      if (isBackspaceHeld) {
        let attempts = 0;
        const interval = setInterval(() => {
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            clearInterval(interval);
            confirmBtn.click();
            flashFeedback(article, "rgba(244, 33, 46, 0.3)");
            setTimeout(() => {
              updateTargets();
              if (currentIndex >= targetArticles.length) currentIndex = Math.max(0, targetArticles.length - 1);
              focusArticle(currentIndex);
            }, 500);
          } else if (++attempts > 40) {
            clearInterval(interval);
          }
        }, 50);
        if (document.title === "\u26A0\uFE0F DRS ACTIVE \u26A0\uFE0F") document.title = originalTitle;
        isBackspaceHeld = false;
      }
    }, 600);
  }
  function toggleCheatSheet() {
    let sheet = document.getElementById("x-ops-cheat-sheet");
    if (sheet) {
      sheet.remove();
      isCheatSheetVisible = false;
      return;
    }
    isCheatSheetVisible = true;
    sheet = document.createElement("div");
    sheet.id = "x-ops-cheat-sheet";
    Object.assign(sheet.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: "10000",
      background: "rgba(15, 15, 20, 0.85)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      padding: "24px",
      color: "#e7e9ea",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      minWidth: "340px",
      fontFamily: '"Segoe UI", system-ui, sans-serif'
    });
    const getMsg = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
    sheet.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span style="color: #ff8c00;">\u26A1</span> X-OPS WALKER
            </div>
            <div style="background: rgba(255, 140, 0, 0.15); color: #ffac30; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.3);">
                ${getMsg("x_cheat_sheet_badge", "CHEAT SHEET")}
            </div>
        </div>
        <div style="font-size: 11px; color: #ff8c00; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg("x_cheat_sheet_sec_nav", "TACTICAL NAVIGATION")}</div>
        <div style="display: grid; grid-template-columns: 90px 1fr; gap: 10px; font-size: 13px; margin-bottom: 16px;">
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">J</kbd> / <kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">K</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_nav", "Navigate Timeline")}</div>
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">N</kbd> / <kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">M</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_patrol", "Star Patrol")}</div>
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">Y</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_profile", "Go Profile")}</div>
        </div>
        <div style="font-size: 11px; color: #f4212e; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg("x_cheat_sheet_sec_action", "COMBAT ACTIONS")}</div>
        <div style="display: grid; grid-template-columns: 90px 1fr; gap: 10px; font-size: 13px;">
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">L</kbd> / <kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">O</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_action", "Like / Repost")}</div>
            <div style="text-align: right;"><kbd style="background: rgba(244,33,46,0.2); border: 1px solid rgba(244,33,46,0.4); border-radius: 4px; padding: 2px 6px; color: #f4212e; font-family: monospace; font-weight: bold;">BS Hold</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_delete", "DRS Delete")}</div>
        </div>
        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #71767b;">
            ${getMsg("x_cheat_sheet_close", "Press H or click anywhere to close")}
        </div>
    `;
    document.body.appendChild(sheet);
    const closer = () => {
      sheet?.remove();
      isCheatSheetVisible = false;
      document.removeEventListener("click", closer);
    };
    setTimeout(() => document.addEventListener("click", closer), 10);
  }

  // src/kernel.ts
  var router = new WalkerRouter(new BaseProtocol());
  router.register(new AiChatProtocol());
  if (window.__XOPS_WALKER_ALIVE__) {
    throw new Error("[X-Ops Walker] Duplicate kernel detected. Old instance exiting silently.");
  }
  function isPWA() {
    return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: window-controls-overlay)").matches;
  }
  if (isPWA()) {
    console.log("[FoxPhantom] PWA mode detected. Shutting down Kernel.");
  }
  window.__XOPS_WALKER_ALIVE__ = true;
  var STORAGE_KEY = "isWalkerMode";
  var BLOCKER_KEY = "blockGoogleOneTap";
  var REGISTERED_ROUTER_KEYS = /* @__PURE__ */ new Set([
    "a",
    "d",
    "s",
    "w",
    "f",
    "x",
    "z",
    "r",
    "m",
    "g",
    "t",
    "9",
    "q",
    "e",
    "c"
  ]);
  function getDeepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  }
  function getScrollParentPiercing(startNode) {
    let el = startNode;
    while (el) {
      const ov = window.getComputedStyle(el).overflowY;
      if ((ov === "auto" || ov === "scroll") && el.scrollHeight > el.clientHeight) {
        return el;
      }
      let parent = el.parentElement;
      if (!parent) {
        const root = el.getRootNode();
        if (root instanceof ShadowRoot) {
          parent = root.host;
        }
      }
      el = parent;
    }
    return document.documentElement;
  }
  function getBestScrollContainer(event) {
    for (const node of event.composedPath()) {
      if (!node || node.nodeType !== 1) continue;
      const el = node;
      const ov = window.getComputedStyle(el).overflowY;
      if ((ov === "auto" || ov === "scroll") && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    const activeC = getScrollParentPiercing(document.activeElement);
    if (activeC !== document.documentElement) return activeC;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const centerEl = getDeepElementFromPoint(centerX, centerY);
    return getScrollParentPiercing(centerEl);
  }
  function isOrphan() {
    try {
      chrome.runtime.getManifest();
      return false;
    } catch {
      window.removeEventListener("keydown", keydownHandler, { capture: true });
      window.__XOPS_WALKER_ALIVE__ = false;
      return true;
    }
  }
  function selfDestruct() {
    window.__XOPS_WALKER_ALIVE__ = false;
    window.removeEventListener("keydown", keydownHandler, { capture: true });
    window.removeEventListener("keyup", suppressSiteShortcutsHandler, { capture: true });
    window.removeEventListener("keypress", suppressSiteShortcutsHandler, { capture: true });
    window.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onWindowFocus);
  }
  var _keepAlivePort = null;
  function connectKeepAlivePort() {
    if (_keepAlivePort) return;
    try {
      _keepAlivePort = chrome.runtime.connect({ name: "walker-keepalive" });
      _keepAlivePort.onDisconnect.addListener(() => {
        _keepAlivePort = null;
      });
    } catch {
    }
  }
  async function safeSendMessage(msg) {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 150;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await chrome.runtime.sendMessage(msg);
        return;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("Extension context invalidated") || errMsg.includes("message channel closed")) {
          selfDestruct();
          return;
        }
        if (errMsg.includes("Receiving end does not exist") && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        console.warn("[X-Ops Walker] sendMessage failed (final):", errMsg, msg);
        return;
      }
    }
  }
  function safeStorageGet(keys, cb) {
    try {
      chrome.storage.local.get(keys).then(cb).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Extension context invalidated")) selfDestruct();
      });
    } catch {
      selfDestruct();
    }
  }
  function safeStorageSet(data) {
    try {
      chrome.storage.local.set(data).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Extension context invalidated")) selfDestruct();
      });
    } catch {
      selfDestruct();
    }
  }
  function t(key) {
    const msg = chrome.i18n.getMessage(key);
    return msg || key;
  }
  var oneTapBlockStyle = document.createElement("style");
  oneTapBlockStyle.textContent = [
    'iframe[src*="accounts.google.com/gsi/"]',
    'iframe[src*="smartlock.google.com"]',
    "#credential_picker_container",
    "#google_one_tap_notification",
    "#google-one-tap-popup"
  ].join(",\n") + " { display: none !important; pointer-events: none !important; }";
  function applyOneTapBlocker(enabled) {
    if (enabled && !oneTapBlockStyle.isConnected) {
      document.documentElement.appendChild(oneTapBlockStyle);
    } else if (!enabled && oneTapBlockStyle.isConnected) {
      oneTapBlockStyle.remove();
    }
  }
  var isWalkerMode = false;
  function isEditableElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName.toUpperCase();
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
    if (el.getAttribute("contentEditable") === "true") return true;
    const role = el.getAttribute("role") ?? "";
    if (role === "textbox" || role === "searchbox" || role === "combobox" || role === "spinbutton") return true;
    return false;
  }
  function isSensitiveElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "INPUT" && el.type === "password") return true;
    const ac = el.getAttribute("autocomplete") ?? "";
    if (ac.includes("password") || ac.startsWith("cc-")) return true;
    if (el.getAttribute("contentEditable") === "true") return true;
    return false;
  }
  function isInputActive2(event) {
    for (const node of event.composedPath()) {
      if (!node || node.nodeType !== 1) continue;
      const el = node;
      if (el === document.body || el === document.documentElement) break;
      if (isSensitiveElement(el)) return true;
      if (isEditableElement(el)) return true;
    }
    return false;
  }
  function shouldPassThrough(event) {
    const isWalkerToggle = event.code === "KeyP" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (!isWalkerMode && event.key !== "Escape" && !isWalkerToggle) return true;
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return true;
    if (event.isComposing || event.key === "Process" || event.keyCode === 229) return true;
    if (isInputActive2(event)) return true;
    if (event.repeat) return true;
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta" || event.key === "Shift") return true;
    return false;
  }
  var hud = (() => {
    const host = document.createElement("div");
    host.id = "fox-walker-host";
    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      bottom: "24px",
      right: "24px",
      display: "none"
    });
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
    :host { all: initial; }
    #hud {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px 7px 10px; border-radius: 999px;
      background: rgba(18, 18, 28, 0.72);
      backdrop-filter: blur(12px) saturate(160%);
      -webkit-backdrop-filter: blur(12px) saturate(160%);
      border: 1px solid rgba(255, 255, 255, 0.10);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 140, 0, 0.15) inset;
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none; user-select: none;
    }
    #hud.visible { opacity: 1; transform: translateY(0) scale(1); }
    .icon { width: 16px; height: 16px; object-fit: contain; vertical-align: middle; }
    .label { color: rgba(255, 255, 255, 0.55); text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; }
    .status { font-size: 12px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; transition: background 0.18s, color 0.18s; }
    .status.on  { background: rgba(255, 140, 0, 0.18); color: #ffac30; box-shadow: 0 0 10px rgba(255, 140, 0, 0.25); }
    .status.off { background: rgba(255, 255, 255, 0.07); color: rgba(255, 255, 255, 0.35); }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.50); }
      70%  { box-shadow: 0 0 0 8px rgba(255, 140, 0, 0.00); }
      100% { box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.00); }
    }
    #hud.pulse { animation: pulse-ring 0.55s ease-out; }
  `;
    const hudEl = document.createElement("div");
    hudEl.id = "hud";
    const iconImg = document.createElement("img");
    iconImg.src = chrome.runtime.getURL("icons/icon48.png");
    iconImg.className = "icon";
    iconImg.alt = "";
    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = t("hud_label");
    const statusSpan = document.createElement("span");
    statusSpan.className = "status off";
    statusSpan.textContent = t("hud_off");
    hudEl.appendChild(iconImg);
    hudEl.appendChild(labelSpan);
    hudEl.appendChild(statusSpan);
    shadow.appendChild(style);
    shadow.appendChild(hudEl);
    const statusEl = hudEl.querySelector(".status");
    let pulseTimer = null;
    function triggerPulse() {
      hudEl.classList.remove("pulse");
      void hudEl.offsetWidth;
      hudEl.classList.add("pulse");
      if (pulseTimer !== null) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => hudEl.classList.remove("pulse"), 600);
    }
    let hideTimer = null;
    function isPWA2() {
      return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: window-controls-overlay)").matches || window.matchMedia("(display-mode: minimal-ui)").matches;
    }
    function setState(active) {
      if (isPWA2()) {
        host.style.display = "none";
        return;
      }
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (active) {
        host.style.display = "block";
        hudEl.classList.add("visible");
        statusEl.className = "status on";
        statusEl.textContent = t("hud_on");
        triggerPulse();
      } else {
        hudEl.classList.remove("visible");
        statusEl.className = "status off";
        statusEl.textContent = t("hud_off");
        hideTimer = setTimeout(() => {
          host.style.display = "none";
        }, 250);
      }
    }
    function mount() {
      if (document.body) {
        document.body.appendChild(host);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body.appendChild(host), { once: true });
      }
    }
    mount();
    return { setState };
  })();
  var cheatsheet = (() => {
    const host = document.createElement("div");
    host.id = "fox-walker-cheatsheet";
    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      display: "none",
      alignItems: "center",
      justifyContent: "center"
    });
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
    :host { all: initial; }
    #overlay {
      display: flex; align-items: center; justify-content: center;
      inset: 0; position: fixed;
      pointer-events: none;
    }
    #panel {
      pointer-events: auto;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: rgba(12, 12, 20, 0.82);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 140, 0, 0.10) inset;
      padding: 24px 28px;
      min-width: 380px;
      max-width: 480px;
      opacity: 0;
      transform: scale(0.94) translateY(10px);
      transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    #panel.visible { opacity: 1; transform: scale(1) translateY(0); }
    #header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px; padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    #header .icon  { width: 20px; height: 20px; object-fit: contain; vertical-align: middle; }
    #header .title { font-size: 13px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(255, 255, 255, 0.85); }
    #header .badge { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffac30; background: rgba(255, 140, 0, 0.15); border-radius: 999px; padding: 2px 8px; }
    table { width: 100%; border-collapse: collapse; }
    tr + tr td { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    td { padding: 7px 4px; font-size: 12px; color: rgba(255, 255, 255, 0.55); vertical-align: middle; }
    td.key-col { width: 110px; white-space: nowrap; }
    .key {
      display: inline-block; font-size: 11px; font-weight: 700;
      font-family: 'Cascadia Code', 'Consolas', monospace;
      color: #ffac30; background: rgba(255, 140, 0, 0.12);
      border: 1px solid rgba(255, 140, 0, 0.25); border-radius: 5px;
      padding: 1px 7px; margin-right: 2px;
    }
    .desc { color: rgba(255, 255, 255, 0.70); }
    .section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255, 140, 0, 0.55); padding: 10px 4px 4px; }
    #footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.07); font-size: 10px; color: rgba(255, 255, 255, 0.25); text-align: center; letter-spacing: 0.06em; }
  `;
    const overlay = document.createElement("div");
    overlay.id = "overlay";
    const panel = document.createElement("div");
    panel.id = "panel";
    const header = document.createElement("div");
    header.id = "header";
    const hIcon = document.createElement("img");
    hIcon.src = chrome.runtime.getURL("icons/icon48.png");
    hIcon.className = "icon";
    hIcon.alt = "";
    const hTitle = document.createElement("span");
    hTitle.className = "title";
    hTitle.textContent = "X-Ops Walker";
    const hBadge = document.createElement("span");
    hBadge.className = "badge";
    hBadge.textContent = t("cs_badge");
    header.appendChild(hIcon);
    header.appendChild(hTitle);
    header.appendChild(hBadge);
    panel.appendChild(header);
    const table = document.createElement("table");
    function addSection(labelKey) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.className = "section-label";
      td.colSpan = 2;
      td.textContent = t(labelKey);
      tr.appendChild(td);
      table.appendChild(tr);
    }
    function addRow(keys, descKey) {
      const tr = document.createElement("tr");
      const keyTd = document.createElement("td");
      keyTd.className = "key-col";
      for (const k of keys) {
        const span = document.createElement("span");
        span.className = "key";
        span.textContent = k;
        keyTd.appendChild(span);
      }
      const descTd = document.createElement("td");
      descTd.className = "desc";
      descTd.textContent = t(descKey);
      tr.appendChild(keyTd);
      tr.appendChild(descTd);
      table.appendChild(tr);
    }
    addSection("cs_section_nav");
    addRow(["A", "D"], "cs_nav_ad");
    addRow(["W", "S"], "cs_nav_ws");
    addRow(["Q", "E"], "cs_nav_qe");
    addSection("cs_section_tab");
    addRow(["Shift", "X"], "cs_tab_xx");
    addRow(["Shift", "Z"], "cs_tab_zz");
    addRow(["Shift", "R"], "cs_tab_rr");
    addRow(["Shift", "M"], "cs_tab_mm");
    addRow(["Shift", "G"], "cs_tab_gg");
    addRow(["Shift", "T"], "cs_tab_tt");
    addRow(["Shift", "W"], "cs_tab_ww");
    addRow(["Shift", "S"], "cs_tab_ss");
    addRow(["Shift", "C"], "cs_tab_cc");
    addSection("cs_section_sys");
    addRow(["Shift", "P"], "cs_sys_shift_p");
    addRow(["F"], "cs_sys_f");
    addRow(["Z"], "cs_sys_z");
    addRow(["Alt", "Z"], "cs_sys_altz");
    panel.appendChild(table);
    const footer = document.createElement("div");
    footer.id = "footer";
    footer.textContent = t("cs_footer");
    panel.appendChild(footer);
    overlay.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(overlay);
    let visible = false;
    function mount() {
      if (document.body) {
        document.body.appendChild(host);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body.appendChild(host), { once: true });
      }
    }
    let csHideTimer = null;
    function show() {
      if (csHideTimer !== null) {
        clearTimeout(csHideTimer);
        csHideTimer = null;
      }
      visible = true;
      host.style.display = "flex";
      requestAnimationFrame(() => panel.classList.add("visible"));
    }
    function hide() {
      visible = false;
      panel.classList.remove("visible");
      csHideTimer = setTimeout(() => {
        if (!visible) host.style.display = "none";
      }, 240);
    }
    function toggle() {
      visible ? hide() : show();
    }
    function isVisible() {
      return visible;
    }
    mount();
    return { toggle, hide, isVisible };
  })();
  window.addEventListener("XOpsWalker_ToggleCheatsheet", () => {
    cheatsheet.toggle();
  });
  function deepBlur(root) {
    if (!root) return;
    let el = root;
    while (el?.shadowRoot?.activeElement) {
      el = el.shadowRoot.activeElement;
    }
    if (el instanceof HTMLElement && el !== document.body) {
      el.blur();
    }
  }
  function blurActiveInput() {
    deepBlur(document.activeElement);
    window.focus();
  }
  function normalizeKey(event) {
    const code = event.code;
    if (code.startsWith("Key")) return code.slice(3).toLowerCase();
    if (code.startsWith("Digit")) return code.slice(5);
    if (code === "Space") return " ";
    return event.key.toLowerCase();
  }
  var isSafetyEnterEnabled = false;
  var isSynthesizing = false;
  try {
    chrome.storage.local.get("alm", (res) => {
      if (!chrome.runtime.lastError && res.alm && res.alm.safetyEnter !== void 0) {
        isSafetyEnterEnabled = res.alm.safetyEnter;
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && "alm" in changes) {
        const alm = changes["alm"].newValue;
        if (alm && alm.safetyEnter !== void 0) {
          isSafetyEnterEnabled = alm.safetyEnter;
        }
      }
    });
  } catch (e) {
  }
  function showSafetyEnterOSD(target) {
    const existing = document.getElementById("x-ops-safety-osd");
    if (existing) existing.remove();
    const osd = document.createElement("div");
    osd.id = "x-ops-safety-osd";
    osd.style.cssText = `
        position: absolute; background: rgba(43, 45, 49, 0.95); color: #fff;
        font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 600;
        padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,140,0,0.4);
        pointer-events: none; z-index: 2147483647; opacity: 0; transition: opacity 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    osd.textContent = "\u{1F4A1} Ctrl+Enter \u3067\u9001\u4FE1";
    const rect = target.getBoundingClientRect();
    osd.style.top = `${window.scrollY + rect.bottom - 25}px`;
    osd.style.left = `${window.scrollX + rect.right - 120}px`;
    document.body.appendChild(osd);
    requestAnimationFrame(() => {
      osd.style.opacity = "1";
      setTimeout(() => {
        osd.style.opacity = "0";
        setTimeout(() => osd.remove(), 200);
      }, 1500);
    });
  }
  function triggerForcedSend(target) {
    isSynthesizing = true;
    try {
      const keyData = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
      target.dispatchEvent(new KeyboardEvent("keydown", keyData));
      target.dispatchEvent(new KeyboardEvent("keypress", keyData));
      target.dispatchEvent(new KeyboardEvent("keyup", keyData));
      setTimeout(() => {
        const sendBtn = target.closest("form")?.querySelector('button[type="submit"]') || document.querySelector('button[data-testid="send-button"]') || document.querySelector('button[aria-label="Send Message"]');
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        }
      }, 50);
    } finally {
      setTimeout(() => {
        isSynthesizing = false;
      }, 50);
    }
  }
  function handleSafetyEnter(event) {
    if (!isSafetyEnterEnabled || isSynthesizing || event.key !== "Enter") return;
    if (isOrphan()) return;
    if (event.isComposing || event.keyCode === 229) return;
    const target = event.target;
    if (!target) return;
    const isTextarea = target.tagName === "TEXTAREA";
    const isContentEditable = target.isContentEditable || !!target.closest('[contenteditable="true"]');
    if (!isTextarea && !isContentEditable) return;
    if (event.shiftKey) return;
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.ctrlKey || event.metaKey) {
      if (event.type === "keydown") triggerForcedSend(target);
      return;
    }
    if (event.type === "keydown") {
      showSafetyEnterOSD(target);
    }
  }
  window.addEventListener("keydown", handleSafetyEnter, true);
  window.addEventListener("keypress", handleSafetyEnter, true);
  window.addEventListener("keyup", handleSafetyEnter, true);
  function keydownHandler(event) {
    if (isOrphan()) return;
    if (isWalkerMode && event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyZ") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      deepBlur(document.activeElement);
      document.body.focus();
      window.focus();
      window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
      const container = getBestScrollContainer(event);
      router.dispatch(event, "z", event.shiftKey, container);
      return;
    }
    if (shouldPassThrough(event)) return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    const key = normalizeKey(event);
    if (event.key === "Escape") {
      if (cheatsheet.isVisible()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        cheatsheet.hide();
      }
      return;
    }
    if (event.code === "KeyP" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (cheatsheet.isVisible()) {
        cheatsheet.hide();
      }
      isWalkerMode = !isWalkerMode;
      safeStorageSet({ [STORAGE_KEY]: isWalkerMode });
      hud.setState(isWalkerMode);
      if (isWalkerMode) blurActiveInput();
      return;
    }
    if (isWalkerMode && REGISTERED_ROUTER_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const container = getBestScrollContainer(event);
      router.dispatch(event, key, event.shiftKey, container);
      return;
    }
  }
  window.addEventListener("keydown", keydownHandler, { capture: true });
  safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!result[BLOCKER_KEY]);
  });
  var currentHost = window.location.hostname;
  if (currentHost === "x.com" || currentHost === "twitter.com") {
    safeStorageGet(["xWalker"], (res) => {
      const xWalker = res.xWalker ?? { enabled: true, rightColumnDashboard: true };
      if (xWalker.enabled) {
        initXWalker(xWalker);
      }
    });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (STORAGE_KEY in changes) {
      isWalkerMode = !!changes[STORAGE_KEY].newValue;
      hud.setState(isWalkerMode);
      if (isWalkerMode && !document.hidden) blurActiveInput();
    }
    if (BLOCKER_KEY in changes) {
      applyOneTapBlocker(!!changes[BLOCKER_KEY].newValue);
    }
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.command === "FORCE_BLUR_ON_ARRIVAL") {
      if (!isWalkerMode) return;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.focus();
      return;
    }
    if (message.command === "MARK_SLEEPING") {
      if (!document.title.startsWith("\u{1F4A4} ")) {
        document.title = "\u{1F4A4} " + document.title;
      }
    }
  });
  function pullStateFromStorage() {
    if (!window.__XOPS_WALKER_ALIVE__) return;
    if (document.title.startsWith("\u{1F4A4} ")) {
      document.title = document.title.slice("\u{1F4A4} ".length);
    }
    safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (res) => {
      isWalkerMode = !!res[STORAGE_KEY];
      hud.setState(isWalkerMode);
      applyOneTapBlocker(!!res[BLOCKER_KEY]);
      if (isWalkerMode) {
        setTimeout(() => {
          if (!isWalkerMode) return;
          if (!window.__XOPS_WALKER_ALIVE__) return;
          blurActiveInput();
        }, 150);
      }
    });
  }
  function onVisibilityChange() {
    if (!document.hidden) pullStateFromStorage();
  }
  function onWindowFocus() {
    pullStateFromStorage();
  }
  window.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onWindowFocus);
  (function installMediaVeto() {
    let mediaVetoActive = false;
    function onMediaPlay() {
      if (mediaVetoActive) return;
      mediaVetoActive = true;
      safeSendMessage({ command: "ALM_VETO" });
    }
    function onMediaPause() {
      const medias = document.querySelectorAll("audio, video");
      const anyPlaying = Array.from(medias).some((m) => !m.paused);
      if (anyPlaying) return;
      if (!mediaVetoActive) return;
      mediaVetoActive = false;
      safeSendMessage({ command: "ALM_VETO_CLEAR" });
    }
    document.addEventListener("play", onMediaPlay, { capture: true });
    document.addEventListener("pause", onMediaPause, { capture: true });
  })();
  (function installInputVeto() {
    let inputVetoActive = false;
    function onInputFocus(event) {
      for (const node of event.composedPath()) {
        if (!node || node.nodeType !== 1) continue;
        const el = node;
        if (el === document.body || el === document.documentElement) break;
        if (isEditableElement(el)) {
          if (!inputVetoActive) {
            inputVetoActive = true;
            safeSendMessage({ command: "ALM_VETO" });
          }
          return;
        }
      }
    }
    function onInputBlur(event) {
      if (!inputVetoActive) return;
      for (const node of event.composedPath()) {
        if (!node || node.nodeType !== 1) continue;
        const el = node;
        if (el === document.body || el === document.documentElement) break;
        if (isEditableElement(el)) {
          const inputEl = el;
          if ("value" in inputEl && inputEl.value.length > 0) {
            return;
          }
          break;
        }
      }
      inputVetoActive = false;
      safeSendMessage({ command: "ALM_VETO_CLEAR" });
    }
    document.addEventListener("focusin", onInputFocus, { capture: true });
    document.addEventListener("focusout", onInputBlur, { capture: true });
  })();
  connectKeepAlivePort();
  function suppressSiteShortcutsHandler(event) {
    if (isOrphan()) return;
    if (shouldPassThrough(event)) return;
    const key = normalizeKey(event);
    if (REGISTERED_ROUTER_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }
  window.addEventListener("keyup", suppressSiteShortcutsHandler, { capture: true });
  window.addEventListener("keypress", suppressSiteShortcutsHandler, { capture: true });
})();
