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
  if (typeof window !== "undefined") {
    window.FoxPhantom = new PhantomState();
  }
})();
