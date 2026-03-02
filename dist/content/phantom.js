"use strict";
(() => {
  // src/content/phantom.ts
  var PhantomState = class {
    config = { master: false, xWalker: false, geminiWalker: false };
    isWalkerActive = false;
    callbacks = [];
    constructor() {
      this.init();
    }
    async init() {
      try {
        const result = await browser.storage.local.get(["phantom", "global"]);
        this.config = result.phantom || { master: true, xWalker: true, geminiWalker: false };
        this.isWalkerActive = !!result.global?.walkerMode;
        console.log("[X-Ops Walker PhantomState] Initializing. Config:", this.config, "WalkerActive:", this.isWalkerActive);
        this.notify();
        browser.storage.onChanged.addListener((changes, area) => {
          if (area === "local") {
            let changed = false;
            if (changes.phantom) {
              this.config = changes.phantom.newValue || { master: true, xWalker: true, geminiWalker: false };
              changed = true;
            }
            if (changes.global) {
              this.isWalkerActive = !!changes.global.newValue?.walkerMode;
              changed = true;
            }
            if (changed) {
              console.log("[X-Ops Walker PhantomState] State Changed:", this.config, "WalkerActive:", this.isWalkerActive);
              this.notify();
            }
          }
        });
      } catch (e) {
        console.error("X-Ops Walker: Error initializing Phantom State", e);
      }
    }
    onChange(callback) {
      this.callbacks.push(callback);
      callback(this.config, this.isWalkerActive);
    }
    notify() {
      this.callbacks.forEach((cb) => cb(this.config, this.isWalkerActive));
    }
  };
  var PhantomUI = class {
    static observer = null;
    static isPrefixing = false;
    static update(isActive) {
      console.log("[X-Ops Walker PhantomState] UI Updated. isPhantom:", isActive);
      this.updateIndicator(isActive);
      this.updateTitle(isActive);
    }
    static updateIndicator(isActive) {
      const event = new CustomEvent("x-ops-state-change", {
        detail: { isPhantom: isActive }
      });
      window.dispatchEvent(event);
    }
    static updateTitle(isActive) {
      if (isActive) {
        if (!this.observer) {
          this.observer = new MutationObserver(() => this.enforceTitlePrefix());
          const titleEl = document.querySelector("title");
          if (titleEl) {
            this.observer.observe(titleEl, { childList: true, subtree: true, characterData: true });
          }
        }
        this.enforceTitlePrefix();
      } else {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        if (document.title.startsWith("\u{1F3AE}")) {
          document.title = document.title.replace(/^🎮/, "");
        }
      }
    }
    static enforceTitlePrefix() {
      if (this.isPrefixing) return;
      if (!document.title.startsWith("\u{1F3AE}")) {
        this.isPrefixing = true;
        document.title = "\u{1F3AE}" + document.title;
        this.isPrefixing = false;
      }
    }
  };
  if (typeof window !== "undefined") {
    let isPhantomInputActive = function() {
      const activeEl = document.activeElement;
      if (!activeEl) return false;
      return ["INPUT", "TEXTAREA"].includes(activeEl.tagName) || activeEl.isContentEditable;
    };
    isPhantomInputActive2 = isPhantomInputActive;
    window.FoxPhantom = new PhantomState();
    window.PhantomUI = PhantomUI;
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (isPhantomInputActive()) return;
      const phantomInstance = window.FoxPhantom;
      if (!phantomInstance || !phantomInstance.isWalkerActive) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        e.stopPropagation();
        browser.storage.local.get("phantom").then((res) => {
          const config = res.phantom || { master: true, xWalker: true, geminiWalker: false };
          config.master = !config.master;
          browser.storage.local.set({ phantom: config });
        });
      }
    }, true);
  }
  var isPhantomInputActive2;
})();
