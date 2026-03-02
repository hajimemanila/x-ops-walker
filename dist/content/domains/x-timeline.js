"use strict";
(() => {
  // src/content/domains/x-timeline.ts
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
  var backspacePressTime = 0;
  var style = document.createElement("style");
  style.textContent = `
    body.x-walker-active article[data-testid="tweet"] { opacity: ${CONFIG.zenOpacity}; transition: opacity 0.2s ease, box-shadow 0.2s ease; }
    body.x-walker-active article[data-testid="tweet"].x-walker-focused { opacity: 1 !important; background-color: rgba(255, 255, 255, 0.03); }
`;
  document.head.appendChild(style);
  function setWalkerState(enabled) {
    if (isActive === enabled) return;
    isActive = enabled;
    if (window.PhantomUI) {
      window.PhantomUI.update(enabled);
    }
    if (isActive) {
      document.body.classList.add("x-walker-active");
      updateTargets();
      if (window.scrollY < 200) currentIndex = -1;
      else findClosestIndex();
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
      if (CONFIG.skipAds && (text.includes("\u30D7\u30ED\u30E2\u30FC\u30B7\u30E7\u30F3") || text.includes("Promoted"))) return false;
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
    const target = targetArticles[index];
    if (target?.isConnected) {
      target.classList.add("x-walker-focused");
      const color = (function(a) {
        const t = a.querySelector("time");
        if (!t) return CONFIG.colors.recent;
        const d = ((/* @__PURE__ */ new Date()).getTime() - new Date(t.getAttribute("datetime") || "").getTime()) / 864e5;
        return d >= 30 ? CONFIG.colors.ancient : d >= 4 ? CONFIG.colors.old : CONFIG.colors.recent;
      })(target);
      target.style.boxShadow = `-4px 0 0 0 ${color}, 0 0 20px ${color}33`;
      const rect = target.getBoundingClientRect();
      window.scrollTo({ top: window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2 - CONFIG.scrollOffset, behavior: "smooth" });
      currentIndex = index;
    } else findClosestIndex();
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
  function xOpsOpenDetail(article) {
    if (!article) return;
    const timeLink = article.querySelector("time")?.closest("a");
    if (timeLink) timeLink.click();
  }
  function xOpsHandleDelete(article, isLongPress) {
    if (isLongPress) {
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        if (article) flashFeedback(article, "rgba(244, 33, 46, 0.3)");
        setTimeout(() => {
          updateTargets();
          if (currentIndex >= targetArticles.length) currentIndex = Math.max(0, targetArticles.length - 1);
          focusArticle(currentIndex);
        }, 500);
        return;
      }
      if (!article) return;
      const caret = article.querySelector('[data-testid="caret"]');
      if (!caret) return;
      caret.click();
      setTimeout(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return;
        const deleteItem = Array.from(menu.querySelectorAll('[role="menuitem"]')).find((el) => el.textContent?.match(/削除|Delete/));
        if (deleteItem) {
          deleteItem.click();
        }
      }, 100);
    } else {
      if (!article) return;
      const caret = article.querySelector('[data-testid="caret"]');
      if (!caret) return;
      caret.click();
      setTimeout(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return;
        const deleteItem = Array.from(menu.querySelectorAll('[role="menuitem"]')).find((el) => el.textContent?.match(/削除|Delete/));
        if (deleteItem) {
          deleteItem.click();
        }
      }, 100);
    }
  }
  function isInputActive() {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    return ["INPUT", "TEXTAREA"].includes(activeEl.tagName) || activeEl.isContentEditable;
  }
  window.addEventListener("keydown", (e) => {
    if (!isActive) return;
    if (isInputActive()) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    if (e.code === "Backspace") {
      if (!e.repeat) backspacePressTime = Date.now();
      e.preventDefault();
      return;
    }
    switch (e.code) {
      case "KeyI":
      case "KeyU":
        e.preventDefault();
        resyncCurrentIndex();
        focusArticle(currentIndex - 1);
        break;
      case "KeyK":
      case "KeyJ":
        e.preventDefault();
        resyncCurrentIndex();
        focusArticle(currentIndex + 1);
        break;
      case "KeyL":
        e.preventDefault();
        executeAction("like");
        break;
      case "KeyO":
        e.preventDefault();
        executeAction("repost");
        break;
      case "KeyP":
        e.preventDefault();
        resyncCurrentIndex();
        xOpsOpenDetail(targetArticles[currentIndex]);
        break;
    }
  }, true);
  window.addEventListener("keyup", (e) => {
    if (!isActive) return;
    if (isInputActive()) return;
    if (e.code === "Backspace") {
      const pressDuration = Date.now() - backspacePressTime;
      resyncCurrentIndex();
      if (targetArticles[currentIndex]) {
        xOpsHandleDelete(targetArticles[currentIndex], pressDuration >= CONFIG.longPressDelay);
      }
      e.preventDefault();
    }
  }, true);
  console.log("[X-Ops Walker X-Timeline] Loaded. Waiting for PhantomState...");
  var checkPhantom = setInterval(() => {
    if (window.FoxPhantom) {
      clearInterval(checkPhantom);
      console.log("[X-Ops Walker X-Timeline] PhantomState connected. Current config:", window.FoxPhantom.config);
      window.FoxPhantom.onChange((config) => {
        console.log("[X-Ops Walker X-Timeline] PhantomState onChange fired:", config);
        const active = !!(config?.master && config?.xWalker);
        setWalkerState(active);
      });
    }
  }, 100);
})();
