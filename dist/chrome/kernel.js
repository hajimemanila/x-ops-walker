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
          container.scrollTo({ top: 0, behavior: "smooth" });
          return true;
      }
      if (event.altKey && key === "z") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
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

  // src/kernel.ts
  var router = new WalkerRouter(new BaseProtocol());
  router.register(new AiChatProtocol());
  if (window.__XOPS_WALKER_ALIVE__) {
    throw new Error("[X-Ops Walker] Duplicate kernel detected. Old instance exiting silently.");
  }
  window.__XOPS_WALKER_ALIVE__ = true;
  var STORAGE_KEY = "isWalkerMode";
  var BLOCKER_KEY = "blockGoogleOneTap";
  var isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
  var WALKER_KEYS = /* @__PURE__ */ new Set([
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
    " ",
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
    window.removeEventListener("keyup", walkerKeyUpHandler, { capture: true });
    window.removeEventListener("keypress", walkerKeyUpHandler, { capture: true });
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
  function isInputActive(event) {
    for (const node of event.composedPath()) {
      if (!node || node.nodeType !== 1) continue;
      const el = node;
      if (el === document.body || el === document.documentElement) break;
      if (isSensitiveElement(el)) return true;
      if (isEditableElement(el)) return true;
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
    addRow(["Space"], "cs_nav_space");
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
    addRow(["Esc"], "cs_sys_esc");
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
  function keydownHandler(event) {
    if (isOrphan()) return;
    if (isWalkerMode && event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyZ") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      deepBlur(document.activeElement);
      document.body.focus();
      window.focus();
      const container = getBestScrollContainer(event);
      router.dispatch(event, "z", event.shiftKey, container);
      return;
    }
    if (!isWalkerMode && event.key !== "Escape") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;
    if (event.isComposing || event.key === "Process" || event.keyCode === 229) return;
    if (isInputActive(event)) return;
    if (event.repeat) return;
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta") return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    const key = normalizeKey(event);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (cheatsheet.isVisible()) {
        cheatsheet.hide();
        return;
      }
      isWalkerMode = !isWalkerMode;
      safeStorageSet({ [STORAGE_KEY]: isWalkerMode });
      hud.setState(isWalkerMode);
      if (isWalkerMode) blurActiveInput();
      return;
    }
    if (isWalkerMode && WALKER_KEYS.has(key)) {
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
    safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (result) => {
      isWalkerMode = !!result[STORAGE_KEY];
      hud.setState(isWalkerMode);
      applyOneTapBlocker(!!result[BLOCKER_KEY]);
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
  connectKeepAlivePort();
  function walkerKeyUpHandler(event) {
    if (isOrphan()) return;
    if (!isWalkerMode) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;
    if (event.isComposing) return;
    if (isInputActive(event)) return;
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta") return;
    if (event.repeat) return;
    const key = normalizeKey(event);
    if (WALKER_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }
  window.addEventListener("keyup", walkerKeyUpHandler, { capture: true });
  window.addEventListener("keypress", walkerKeyUpHandler, { capture: true });
})();
