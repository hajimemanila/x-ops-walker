"use strict";
(() => {
  // src/kernel.ts
  var STORAGE_KEY = "isWalkerMode";
  var SCROLL_AMOUNT = 380;
  var DOUBLE_TAP_DELAY = 250;
  var WALKER_KEYS = /* @__PURE__ */ new Set(["a", "d", "s", "w", "f", "x", "z", "r", "m", "g", "0", "9", " ", "q", "e", "v", "c"]);
  var DOUBLE_ACTIONS = {
    "g": "DISCARD_TAB",
    "x": "CLOSE_TAB",
    "z": "UNDO_CLOSE",
    "0": "CLEAN_UP",
    "9": "GO_FIRST_TAB",
    "m": "MUTE_TAB",
    "r": "RELOAD_TAB",
    "c": "DUPLICATE_TAB"
  };
  var DOUBLE_LOCAL_ACTIONS = {
    "w": () => window.scrollTo({ top: 0, behavior: "smooth" }),
    "v": () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
  };
  var NAV_ACTIONS = {
    "w": () => window.scrollBy({ top: -SCROLL_AMOUNT, behavior: "smooth" }),
    "s": () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" }),
    "a": () => browser.runtime.sendMessage({ command: "PREV_TAB" }),
    "d": () => browser.runtime.sendMessage({ command: "NEXT_TAB" })
  };
  var BLOCKER_KEY = "blockGoogleOneTap";
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
  var lastKey = null;
  var lastKeyTime = 0;
  function t(key) {
    const msg = browser.i18n.getMessage(key);
    return msg || key;
  }
  function isSensitiveElement(el) {
    const htmlEl = el;
    if (el.tagName === "INPUT" && el.type === "password") return true;
    const ac = htmlEl.getAttribute("autocomplete") ?? "";
    if (ac.includes("password") || ac.startsWith("cc-")) return true;
    if (htmlEl.isContentEditable) return true;
    return false;
  }
  function isInputActive() {
    const el = document.activeElement;
    if (!el) return false;
    if (isSensitiveElement(el)) return true;
    const tag = el.tagName.toUpperCase();
    if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(tag)) return true;
    if (el.shadowRoot) {
      const inner = el.shadowRoot.activeElement;
      if (inner) {
        if (isSensitiveElement(inner)) return true;
        const innerTag = inner.tagName.toUpperCase();
        if (["INPUT", "TEXTAREA", "SELECT"].includes(innerTag)) return true;
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
      right: "24px",
      display: "none"
      // 初期状態: レイアウトツリーから完全除外
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
    iconImg.src = browser.runtime.getURL("icons/icon48.png");
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
    function setState(active) {
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
      // 初期状態: DOMに存在するがレイアウトツリー外
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
    hIcon.src = browser.runtime.getURL("icons/icon48.png");
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
    addRow(["Space"], "cs_nav_space");
    addRow(["W", "S"], "cs_nav_ws");
    addRow(["Q", "E"], "cs_nav_qe");
    addSection("cs_section_tab");
    addRow(["X", "X"], "cs_tab_xx");
    addRow(["Z", "Z"], "cs_tab_zz");
    addRow(["R", "R"], "cs_tab_rr");
    addRow(["M", "M"], "cs_tab_mm");
    addRow(["G", "G"], "cs_tab_gg");
    addRow(["0", "0"], "cs_tab_00");
    addRow(["W", "W"], "cs_tab_ww");
    addRow(["V", "V"], "cs_tab_vv");
    addRow(["C", "C"], "cs_tab_cc");
    addSection("cs_section_sys");
    addRow(["Esc"], "cs_sys_esc");
    addRow(["F"], "cs_sys_f");
    addRow(["Z"], "cs_sys_z");
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
  browser.storage.local.get([STORAGE_KEY, BLOCKER_KEY]).then((result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!result[BLOCKER_KEY]);
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (STORAGE_KEY in changes) {
      isWalkerMode = !!changes[STORAGE_KEY].newValue;
      hud.setState(isWalkerMode);
    }
    if (BLOCKER_KEY in changes) {
      applyOneTapBlocker(!!changes[BLOCKER_KEY].newValue);
    }
  });
  browser.runtime.onMessage.addListener((message) => {
    if (message.command !== "FORCE_BLUR_ON_ARRIVAL") return;
    if (!isWalkerMode) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.focus();
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
    if (isDoubleTap && DOUBLE_ACTIONS[key]) {
      event.preventDefault();
      browser.runtime.sendMessage({ command: DOUBLE_ACTIONS[key] });
      return;
    }
    if (isDoubleTap && DOUBLE_LOCAL_ACTIONS[key]) {
      event.preventDefault();
      DOUBLE_LOCAL_ACTIONS[key]();
      return;
    }
    if (key === "f") {
      event.preventDefault();
      cheatsheet.toggle();
      return;
    }
    if (key === " ") {
      event.preventDefault();
      browser.runtime.sendMessage({ command: shift ? "PREV_TAB" : "NEXT_TAB" });
      return;
    }
    if (key === "q") {
      event.preventDefault();
      window.history.back();
      return;
    }
    if (key === "e") {
      event.preventDefault();
      window.history.forward();
      return;
    }
    if (key === "z" && !isDoubleTap) {
      event.preventDefault();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.focus();
      return;
    }
    if (NAV_ACTIONS[key]) {
      event.preventDefault();
      NAV_ACTIONS[key]();
    }
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta") return;
    if (event.repeat) return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    if (event.key === "Escape") {
      if (cheatsheet.isVisible()) {
        cheatsheet.hide();
        return;
      }
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
