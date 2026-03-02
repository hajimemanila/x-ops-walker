"use strict";
(() => {
  // src/kernel.ts
  var SCROLL_AMOUNT = 380;
  var WALKER_KEYS = /* @__PURE__ */ new Set(["a", "d", "s", "w", "f", "h", "x", "z", "r", "m", "g", "t", "9", " ", "q", "e", "c"]);
  var SHIFT_ACTIONS = {
    "x": "CLOSE_TAB",
    "z": "UNDO_CLOSE",
    "r": "RELOAD_TAB",
    "m": "MUTE_TAB",
    "g": "DISCARD_TAB",
    "t": "CLEAN_UP",
    "9": "GO_FIRST_TAB",
    "c": "DUPLICATE_TAB"
  };
  var SHIFT_LOCAL_ACTIONS = {
    "w": () => window.scrollTo({ top: 0, behavior: "smooth" }),
    "s": () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
  };
  var NAV_ACTIONS = {
    "w": () => window.scrollBy({ top: -SCROLL_AMOUNT, behavior: "smooth" }),
    "s": () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" }),
    "a": () => browser.runtime.sendMessage({ command: "PREV_TAB" }),
    "d": () => browser.runtime.sendMessage({ command: "NEXT_TAB" })
  };
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
    host.id = "x-ops-walker-host";
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
    #x-ops-hud {
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
    #x-ops-hud.visible { opacity: 1; transform: translateY(0) scale(1); }
    .icon { width: 16px; height: 16px; object-fit: contain; vertical-align: middle; }
    .hud-label { color: rgba(255, 255, 255, 0.55); text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; }
    .status { font-size: 12px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; transition: background 0.18s, color 0.18s; }
    .status.on  { background: rgba(255, 140, 0, 0.18); color: #ffac30; box-shadow: 0 0 10px rgba(255, 140, 0, 0.25); }
    .status.off { background: rgba(255, 255, 255, 0.07); color: rgba(255, 255, 255, 0.35); }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.50); }
      70%  { box-shadow: 0 0 0 8px rgba(255, 140, 0, 0.00); }
      100% { box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.00); }
    }
    #x-ops-hud.pulse { animation: pulse-ring 0.55s ease-out; }
  `;
    const hudEl = document.createElement("div");
    hudEl.id = "x-ops-hud";
    const iconImg = document.createElement("img");
    iconImg.src = browser.runtime.getURL("icons/icon48.png");
    iconImg.className = "icon";
    iconImg.alt = "";
    const labelSpan = document.createElement("span");
    labelSpan.className = "hud-label";
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
    function setPhantomState(isPhantom) {
      if (isPhantom) {
        hudEl.style.setProperty("border", "2px solid #a855f7", "important");
        hudEl.style.setProperty("box-shadow", "0 0 15px #a855f7", "important");
        labelSpan.textContent = "\u{1F3AE} PHANTOM";
        labelSpan.style.setProperty("color", "#a855f7", "important");
        statusSpan.textContent = "ACTIVE";
        statusSpan.style.setProperty("background", "rgba(168, 85, 247, 0.25)", "important");
        statusSpan.style.setProperty("color", "#a855f7", "important");
        statusSpan.style.setProperty("box-shadow", "0 0 14px rgba(168, 85, 247, 0.35)", "important");
        iconImg.style.setProperty("filter", "hue-rotate(270deg) drop-shadow(0 0 6px rgba(168,85,247,0.6))", "important");
        host.style.display = "block";
        hudEl.classList.add("visible");
        hudEl.style.opacity = "1";
      } else {
        hudEl.style.removeProperty("border");
        hudEl.style.removeProperty("box-shadow");
        labelSpan.textContent = t("hud_label");
        labelSpan.style.removeProperty("color");
        statusSpan.style.removeProperty("background");
        statusSpan.style.removeProperty("color");
        statusSpan.style.removeProperty("box-shadow");
        iconImg.style.removeProperty("filter");
        setState(isWalkerMode);
      }
    }
    mount();
    return { setState, setPhantomState };
  })();
  var cheatsheet = (() => {
    const host = document.createElement("div");
    host.id = "x-ops-walker-cheatsheet";
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
    const footer = document.createElement("div");
    footer.id = "footer";
    panel.appendChild(footer);
    function renderTable(mode) {
      table.innerHTML = "";
      const host2 = window.location.hostname;
      if (mode === "domain") {
        footer.textContent = t("cheatsheet_close_domain");
        if (host2 === "x.com" || host2 === "twitter.com") {
          hTitle.textContent = t("cheatsheet_title_x");
          addSection("cs_phantom_section");
          addRow(["J", "K"], "cs_x_jk");
          addRow(["L"], "cs_x_l");
          addRow(["O"], "cs_x_o");
          addRow(["Backspace"], "cs_x_backspace");
          addRow(["N"], "cs_x_n_star");
          addRow(["M"], "cs_x_m_star");
          addRow(["Y"], "cs_x_y_profile");
        } else if (host2 === "gemini.google.com") {
          hTitle.textContent = t("cheatsheet_title_gemini");
          addSection("cs_phantom_section");
          addRow(["Coming"], "cs_nav_space");
        } else {
          hTitle.textContent = t("extension_name");
          addSection("cs_phantom_section");
          addRow(["-"], "cheatsheet_no_domain");
        }
      } else {
        hTitle.textContent = t("extension_name");
        footer.textContent = t("cheatsheet_close_global");
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
        addRow(["Shift", "P"], "cs_x_shift_p");
        addRow(["F"], "cs_sys_f");
        addRow(["Z"], "cs_sys_z");
        addRow(["P", "(Phantom)"], "cs_x_p_toggle");
      }
    }
    panel.insertBefore(table, footer);
    overlay.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(overlay);
    let visible = false;
    let currentMode = null;
    function mount() {
      if (document.body) {
        document.body.appendChild(host);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body.appendChild(host), { once: true });
      }
    }
    let csHideTimer = null;
    function show(mode) {
      currentMode = mode;
      renderTable(mode);
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
      currentMode = null;
      panel.classList.remove("visible");
      csHideTimer = setTimeout(() => {
        if (!visible) host.style.display = "none";
      }, 240);
    }
    function toggle(mode) {
      if (visible && currentMode === mode) {
        hide();
      } else {
        show(mode);
      }
    }
    function isVisible() {
      return visible;
    }
    window.addEventListener("x-ops-global-reset", () => {
      if (visible) hide();
    });
    mount();
    return { toggle, hide, isVisible };
  })();
  function blurActiveInput() {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el !== document.body) {
      el.blur();
    }
    window.focus();
  }
  browser.storage.local.get(["global"]).then((result) => {
    const globalConfig = result.global || {};
    isWalkerMode = !!globalConfig.walkerMode;
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!globalConfig.oneTap);
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("global" in changes) {
      const newVal = changes.global.newValue || {};
      const oldVal = changes.global.oldValue || {};
      if (newVal.walkerMode !== oldVal.walkerMode) {
        isWalkerMode = !!newVal.walkerMode;
        hud.setState(isWalkerMode);
        if (isWalkerMode && !document.hidden) blurActiveInput();
        window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
      }
      if (newVal.oneTap !== oldVal.oneTap) {
        applyOneTapBlocker(!!newVal.oneTap);
      }
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
  window.addEventListener("x-ops-state-change", ((e) => {
    if (e.detail && typeof e.detail.isPhantom === "boolean") {
      hud.setPhantomState(e.detail.isPhantom);
    }
  }));
  function normalizeKey(event) {
    const code = event.code;
    if (code.startsWith("Key")) return code.slice(3).toLowerCase();
    if (code.startsWith("Digit")) return code.slice(5);
    if (code === "Space") return " ";
    return event.key.toLowerCase();
  }
  function handleKeyInput(event) {
    const key = normalizeKey(event);
    const shift = event.shiftKey;
    if (shift && SHIFT_ACTIONS[key]) {
      event.preventDefault();
      event.stopPropagation();
      browser.runtime.sendMessage({ command: SHIFT_ACTIONS[key] });
      return;
    }
    if (shift && SHIFT_LOCAL_ACTIONS[key]) {
      event.preventDefault();
      event.stopPropagation();
      SHIFT_LOCAL_ACTIONS[key]();
      return;
    }
    if (key === "f") {
      event.preventDefault();
      cheatsheet.toggle("global");
      return;
    }
    if (key === "h") {
      event.preventDefault();
      cheatsheet.toggle("domain");
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
    if (key === "z" && !shift) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.focus();
      window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
      return;
    }
    if (!shift && NAV_ACTIONS[key]) {
      event.preventDefault();
      NAV_ACTIONS[key]();
    }
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta") return;
    if (event.repeat) return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    if (event.key === "Escape" || event.key.toLowerCase() === "p" && event.shiftKey) {
      if (event.key === "Escape" && cheatsheet.isVisible()) {
        cheatsheet.hide();
        return;
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopPropagation();
      }
      isWalkerMode = !isWalkerMode;
      browser.storage.local.get(["global"]).then((res) => {
        const globalConfig = res.global || {};
        globalConfig.walkerMode = isWalkerMode;
        browser.storage.local.set({ global: globalConfig });
      });
      hud.setState(isWalkerMode);
      if (isWalkerMode) blurActiveInput();
      return;
    }
    if (!isWalkerMode || isInputActive()) return;
    const key = normalizeKey(event);
    if (WALKER_KEYS.has(key)) {
      event.stopPropagation();
    }
    handleKeyInput(event);
  }, { capture: true });
})();
