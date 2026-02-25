"use strict";
(() => {
  // src/kernel.ts
  var STORAGE_KEY = "isWalkerMode";
  var SCROLL_AMOUNT = 380;
  var DOUBLE_TAP_DELAY = 250;
  var WALKER_KEYS = /* @__PURE__ */ new Set(["a", "d", "s", "w", "f", "x", "z", "r", "m", "g", "0", " "]);
  var isWalkerMode = false;
  var lastKey = null;
  var lastKeyTime = 0;
  function isInputActive() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toUpperCase();
    if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(tag)) return true;
    if (el.isContentEditable) return true;
    if (el.shadowRoot) {
      const inner = el.shadowRoot.activeElement;
      if (inner) {
        const innerTag = inner.tagName.toUpperCase();
        if (["INPUT", "TEXTAREA", "SELECT"].includes(innerTag)) return true;
        if (inner.isContentEditable) return true;
      }
    }
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
      right: "24px"
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
    .icon { font-size: 16px; line-height: 1; }
    .label { color: rgba(255, 255, 255, 0.55); text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; }
    .status { font-size: 12px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; transition: background 0.18s, color 0.18s; }
    .status.on { background: rgba(255, 140, 0, 0.18); color: #ffac30; box-shadow: 0 0 10px rgba(255, 140, 0, 0.25); }
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
    hudEl.innerHTML = `<span class="icon">\u{1F98A}</span><span class="label">Walker Mode</span><span class="status off">OFF</span>`;
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
    function setState(active) {
      if (active) {
        hudEl.classList.add("visible");
        statusEl.className = "status on";
        statusEl.textContent = "ON";
        triggerPulse();
      } else {
        hudEl.classList.remove("visible");
        statusEl.className = "status off";
        statusEl.textContent = "OFF";
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
  browser.storage.local.get(STORAGE_KEY).then((result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(STORAGE_KEY in changes)) return;
    isWalkerMode = !!changes[STORAGE_KEY].newValue;
    hud.setState(isWalkerMode);
  });
  function handleKeyInput(event) {
    const key = event.key.toLowerCase();
    const shift = event.shiftKey;
    const currentTime = Date.now();
    const isDoubleTap = key === lastKey && currentTime - lastKeyTime < DOUBLE_TAP_DELAY;
    if (!isDoubleTap) {
      lastKey = key;
      lastKeyTime = currentTime;
    } else {
      lastKey = null;
    }
    const doubleActions = {
      "g": "DISCARD_TAB",
      "x": "CLOSE_TAB",
      "z": "UNDO_CLOSE",
      "0": "CLEAN_UP",
      "9": "GO_FIRST_TAB",
      "m": "MUTE_TAB",
      "r": "RELOAD_TAB"
    };
    if (isDoubleTap && key === "l") {
      event.preventDefault();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", keyCode: 117, bubbles: true }));
      return;
    }
    if (isDoubleTap && doubleActions[key]) {
      event.preventDefault();
      browser.runtime.sendMessage({ command: doubleActions[key] });
      return;
    }
    const navActions = {
      "w": () => window.scrollBy({ top: -SCROLL_AMOUNT, behavior: "smooth" }),
      "s": () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" }),
      "a": () => browser.runtime.sendMessage({ command: "PREV_TAB" }),
      "d": () => browser.runtime.sendMessage({ command: "NEXT_TAB" }),
      " ": () => browser.runtime.sendMessage({ command: shift ? "PREV_TAB" : "NEXT_TAB" })
    };
    if (navActions[key]) {
      event.preventDefault();
      navActions[key]();
    }
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta") return;
    if (event.repeat) return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    if (event.key === "Escape") {
      isWalkerMode = !isWalkerMode;
      browser.storage.local.set({ [STORAGE_KEY]: isWalkerMode });
      hud.setState(isWalkerMode);
      return;
    }
    if (!isWalkerMode || isInputActive()) return;
    const key = event.key.toLowerCase();
    if (WALKER_KEYS.has(key)) {
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    handleKeyInput(event);
  }, { capture: true });
})();
