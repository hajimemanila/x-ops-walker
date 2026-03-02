"use strict";
(() => {
  // src/content/phantom.ts
  var PhantomState = class {
    config = { master: false, xWalker: false, geminiWalker: false };
    callbacks = [];
    constructor() {
      this.init();
    }
    async init() {
      try {
        const result = await browser.storage.local.get("phantom");
        this.config = result.phantom || { master: true, xWalker: true, geminiWalker: false };
        console.log("[X-Ops Walker PhantomState] Initializing. Config:", this.config);
        this.notify();
        browser.storage.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.phantom) {
            this.config = changes.phantom.newValue || { master: true, xWalker: true, geminiWalker: false };
            console.log("[X-Ops Walker PhantomState] State Changed:", this.config);
            this.notify();
          }
        });
      } catch (e) {
        console.error("X-Ops Walker: Error initializing Phantom State", e);
      }
    }
    onChange(callback) {
      this.callbacks.push(callback);
      callback(this.config);
    }
    notify() {
      this.callbacks.forEach((cb) => cb(this.config));
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
    window.FoxPhantom = new PhantomState();
    window.PhantomUI = PhantomUI;
  }
})();
