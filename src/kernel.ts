// ============================================================================
// X-Ops Walker — kernel.ts  (Chrome MV3 Hardened)
// ============================================================================
// 設計原則:
//   P1. Orphan（亡霊）検知と自己終了
//   P2. Service Worker 完全非依存の自立した状態管理
//   P3. キャプチャフェーズ先頭での同期的イベント強奪
// ============================================================================

import { WalkerRouter } from './router';
import { BaseProtocol } from './protocols/base';
import { AiChatProtocol } from './protocols/ai-chat';
import { initXWalker, XTimelineProtocol } from './protocols/x-timeline';
import { interceptSafetyEnter } from './protocols/safety-enter';

const router = new WalkerRouter(new BaseProtocol());
router.register(new AiChatProtocol());
router.register(new XTimelineProtocol());

// ── P1: 多重注入ガード ────────────────────────────────────────────────────────
declare global {
    interface Window {
        __XOPS_WALKER_ALIVE__: boolean;
    }
}

if (window.__XOPS_WALKER_ALIVE__) {
    throw new Error('[X-Ops Walker] Duplicate kernel detected. Old instance exiting silently.');
}

// --- PWA検知ブロック ---
function isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches;
}

if (isPWA()) {
    console.log("[FoxPhantom] PWA mode detected. Shutting down Kernel.");
}
// ----------------------------------------------------

window.__XOPS_WALKER_ALIVE__ = true;

// ── 定数 ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'isWalkerMode';
const BLOCKER_KEY = 'blockGoogleOneTap';

// Walkerキー全体セット
const REGISTERED_ROUTER_KEYS = new Set([
    // Base & Universal Keys
    'a', 'd', 's', 'w', 'f', 'x', 'z', 'r', 'm', 'g', 't', '9', 'q', 'e', 'c',
    // X Timeline & Domain Specific Keys
    'j', 'k', 'l', 'o', 'b', 'i', 'u', 'h', 'n', 'y', ';', '/', ',', 'enter', 'backspace'
]);

// ── スクロールユーティリティ ────────────────────────────
function getDeepElementFromPoint(x: number, y: number): Element | null {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
        const inner = el.shadowRoot.elementFromPoint(x, y);
        if (!inner || inner === el) break;
        el = inner;
    }
    return el;
}

function getScrollParentPiercing(startNode: Element | null): Element {
    let el = startNode;
    while (el) {
        const ov = window.getComputedStyle(el).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) {
            return el;
        }

        let parent: Element | null = el.parentElement;
        if (!parent) {
            const root = el.getRootNode();
            if (root instanceof ShadowRoot) {
                parent = root.host as Element;
            }
        }
        el = parent;
    }
    return document.documentElement;
}

function getBestScrollContainer(event: KeyboardEvent): Element {
    for (const node of event.composedPath()) {
        if (!node || (node as Node).nodeType !== 1) continue;
        const el = node as Element;
        const ov = window.getComputedStyle(el).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) {
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

// ── P1: Orphan フェイルセーフ ─────────────────────────────────────────────────
function isOrphan(): boolean {
    try {
        chrome.runtime.getManifest();
        return false;
    } catch {
        window.removeEventListener('keydown', keydownHandler, { capture: true });
        window.__XOPS_WALKER_ALIVE__ = false;
        return true;
    }
}

// ── P1: 安全な API ラッパー群 ────────────────────────────────────────────────
function selfDestruct(): void {
    window.__XOPS_WALKER_ALIVE__ = false;
    window.removeEventListener('keydown', keydownHandler, { capture: true });
    window.removeEventListener('keyup', suppressSiteShortcutsHandler, { capture: true });
    window.removeEventListener('keypress', suppressSiteShortcutsHandler, { capture: true });
    window.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onWindowFocus);
}

let _keepAlivePort: chrome.runtime.Port | null = null;
function connectKeepAlivePort(): void {
    if (_keepAlivePort) return;
    try {
        _keepAlivePort = chrome.runtime.connect({ name: 'walker-keepalive' });
        _keepAlivePort.onDisconnect.addListener(() => {
            _keepAlivePort = null;
        });
    } catch { }
}

async function safeSendMessage(msg: object): Promise<void> {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 150;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await chrome.runtime.sendMessage(msg);
            return;
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (errMsg.includes('Extension context invalidated') || errMsg.includes('message channel closed')) {
                selfDestruct();
                return;
            }
            if (errMsg.includes('Receiving end does not exist') && attempt < MAX_RETRIES) {
                await new Promise<void>(r => setTimeout(r, RETRY_DELAY_MS));
                continue;
            }
            console.warn('[X-Ops Walker] sendMessage failed (final):', errMsg, msg);
            return;
        }
    }
}

function safeStorageGet(keys: string[], cb: (result: Record<string, unknown>) => void): void {
    try {
        chrome.storage.local.get(keys).then(cb).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('Extension context invalidated')) selfDestruct();
        });
    } catch {
        selfDestruct();
    }
}

function safeStorageSet(data: Record<string, unknown>): void {
    try {
        chrome.storage.local.set(data).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('Extension context invalidated')) selfDestruct();
        });
    } catch {
        selfDestruct();
    }
}

function t(key: string): string {
    const msg = chrome.i18n.getMessage(key);
    return msg || key;
}

// ── Google One Tap 迎撃 CSS ───────────────────────────────────────────────────
const oneTapBlockStyle = document.createElement('style');
oneTapBlockStyle.textContent = [
    'iframe[src*="accounts.google.com/gsi/"]',
    'iframe[src*="smartlock.google.com"]',
    '#credential_picker_container',
    '#google_one_tap_notification',
    '#google-one-tap-popup',
].join(',\n') + ' { display: none !important; pointer-events: none !important; }';

function applyOneTapBlocker(enabled: boolean): void {
    if (enabled && !oneTapBlockStyle.isConnected) {
        document.documentElement.appendChild(oneTapBlockStyle);
    } else if (!enabled && oneTapBlockStyle.isConnected) {
        oneTapBlockStyle.remove();
    }
}

// ── P2: 自立した状態変数 ─────────────────────────────────────────────────────
let isWalkerMode = false;

// ── Security Guard: 機密入力フィールドの検出 ──────────────────────────────────
function isEditableElement(el: Element): boolean {
    if (!el || (el as Node).nodeType !== 1) return false;
    const tag = el.tagName.toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
    if (el.getAttribute('contentEditable') === 'true') return true;
    const role = el.getAttribute('role') ?? '';
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox' || role === 'spinbutton') return true;
    return false;
}

function isSensitiveElement(el: Element): boolean {
    if (!el || (el as Node).nodeType !== 1) return false;
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password') return true;
    const ac = el.getAttribute('autocomplete') ?? '';
    if (ac.includes('password') || ac.startsWith('cc-')) return true;
    if (el.getAttribute('contentEditable') === 'true') return true;
    return false;
}

function isInputActive(event: KeyboardEvent): boolean {
    for (const node of event.composedPath()) {
        if (!node || (node as Node).nodeType !== 1) continue;
        const el = node as Element;
        if (el === document.body || el === document.documentElement) break;
        if (isSensitiveElement(el)) return true;
        if (isEditableElement(el)) return true;
    }
    return false;
}

function shouldPassThrough(event: KeyboardEvent): boolean {
    const isWalkerToggle = event.code === 'KeyP' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (!isWalkerMode && event.key !== 'Escape' && !isWalkerToggle) return true;
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return true;
    if (event.isComposing || event.key === 'Process' || event.keyCode === 229) return true;
    if (isInputActive(event)) return true;
    if (event.repeat) return true;
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta' || event.key === 'Shift') return true;
    return false;
}

// ── HUD (Shadow DOM) ──────────────────────────────────────────────────────────
interface HudController {
    setState(active: boolean): void;
}

const hud: HudController = (() => {
    const host = document.createElement('div');
    host.id = 'fox-walker-host';
    Object.assign(host.style, {
        all: 'initial', position: 'fixed', zIndex: '2147483647',
        pointerEvents: 'none', bottom: '24px', right: '24px',
        display: 'none',
    });

    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
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

    const hudEl = document.createElement('div');
    hudEl.id = 'hud';

    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/icon48.png');
    iconImg.className = 'icon';
    iconImg.alt = '';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = t('hud_label');

    const statusSpan = document.createElement('span');
    statusSpan.className = 'status off';
    statusSpan.textContent = t('hud_off');

    hudEl.appendChild(iconImg);
    hudEl.appendChild(labelSpan);
    hudEl.appendChild(statusSpan);

    shadow.appendChild(style);
    shadow.appendChild(hudEl);
    const statusEl = hudEl.querySelector<HTMLElement>('.status')!;

    let pulseTimer: ReturnType<typeof setTimeout> | null = null;
    function triggerPulse(): void {
        hudEl.classList.remove('pulse');
        void hudEl.offsetWidth;
        hudEl.classList.add('pulse');
        if (pulseTimer !== null) clearTimeout(pulseTimer);
        pulseTimer = setTimeout(() => hudEl.classList.remove('pulse'), 600);
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    function isPWA(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: window-controls-overlay)').matches ||
            window.matchMedia('(display-mode: minimal-ui)').matches;
    }
    function setState(active: boolean): void {
        if (isPWA()) {
            host.style.display = 'none';
            return;
        }
        if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; }
        if (active) {
            host.style.display = 'block';
            hudEl.classList.add('visible');
            statusEl.className = 'status on';
            statusEl.textContent = t('hud_on');
            triggerPulse();
        } else {
            hudEl.classList.remove('visible');
            statusEl.className = 'status off';
            statusEl.textContent = t('hud_off');
            hideTimer = setTimeout(() => { host.style.display = 'none'; }, 250);
        }
    }

    function mount(): void {
        if (document.body) {
            document.body.appendChild(host);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(host), { once: true });
        }
    }

    mount();
    return { setState };
})();


// ── Cheatsheet (Shadow DOM) ───────────────────────────────────────────────────
interface CheatsheetController {
    toggle(): void;
    hide(): void;
    isVisible(): boolean;
}

const cheatsheet: CheatsheetController = (() => {
    const host = document.createElement('div');
    host.id = 'fox-walker-cheatsheet';
    Object.assign(host.style, {
        all: 'initial', position: 'fixed', inset: '0',
        zIndex: '2147483646', display: 'none',
        alignItems: 'center', justifyContent: 'center',
    });

    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
    :host { all: initial; }
    #overlay { display: flex; align-items: center; justify-content: center; inset: 0; position: fixed; pointer-events: none; }
    #panel { pointer-events: auto; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: rgba(12, 12, 20, 0.82); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 140, 0, 0.10) inset; padding: 24px 28px; min-width: 380px; max-width: 480px; opacity: 0; transform: scale(0.94) translateY(10px); transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; }
    #panel.visible { opacity: 1; transform: scale(1) translateY(0); }
    #header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    #header .icon  { width: 20px; height: 20px; object-fit: contain; vertical-align: middle; }
    #header .title { font-size: 13px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(255, 255, 255, 0.85); }
    #header .badge { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffac30; background: rgba(255, 140, 0, 0.15); border-radius: 999px; padding: 2px 8px; }
    table { width: 100%; border-collapse: collapse; }
    tr + tr td { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    td { padding: 7px 4px; font-size: 12px; color: rgba(255, 255, 255, 0.55); vertical-align: middle; }
    td.key-col { width: 110px; white-space: nowrap; }
    .key { display: inline-block; font-size: 11px; font-weight: 700; font-family: 'Cascadia Code', 'Consolas', monospace; color: #ffac30; background: rgba(255, 140, 0, 0.12); border: 1px solid rgba(255, 140, 0, 0.25); border-radius: 5px; padding: 1px 7px; margin-right: 2px; }
    .desc { color: rgba(255, 255, 255, 0.70); }
    .section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255, 140, 0, 0.55); padding: 10px 4px 4px; }
    #footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.07); font-size: 10px; color: rgba(255, 255, 255, 0.25); text-align: center; letter-spacing: 0.06em; }
  `;

    const overlay = document.createElement('div');
    overlay.id = 'overlay';

    const panel = document.createElement('div');
    panel.id = 'panel';

    const header = document.createElement('div');
    header.id = 'header';
    const hIcon = document.createElement('img');
    hIcon.src = chrome.runtime.getURL('icons/icon48.png');
    hIcon.className = 'icon';
    hIcon.alt = '';
    const hTitle = document.createElement('span');
    hTitle.className = 'title';
    hTitle.textContent = 'X-Ops Walker';
    const hBadge = document.createElement('span');
    hBadge.className = 'badge';
    hBadge.textContent = t('cs_badge');
    header.appendChild(hIcon);
    header.appendChild(hTitle);
    header.appendChild(hBadge);
    panel.appendChild(header);

    const table = document.createElement('table');

    function addSection(labelKey: string): void {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.className = 'section-label';
        td.colSpan = 2;
        td.textContent = t(labelKey);
        tr.appendChild(td);
        table.appendChild(tr);
    }

    function addRow(keys: string[], descKey: string): void {
        const tr = document.createElement('tr');
        const keyTd = document.createElement('td');
        keyTd.className = 'key-col';
        for (const k of keys) {
            const span = document.createElement('span');
            span.className = 'key';
            span.textContent = k;
            keyTd.appendChild(span);
        }
        const descTd = document.createElement('td');
        descTd.className = 'desc';
        descTd.textContent = t(descKey);
        tr.appendChild(keyTd);
        tr.appendChild(descTd);
        table.appendChild(tr);
    }

    addSection('cs_section_nav');
    addRow(['A', 'D'], 'cs_nav_ad');
    addRow(['W', 'S'], 'cs_nav_ws');
    addRow(['Q', 'E'], 'cs_nav_qe');

    addSection('cs_section_tab');
    addRow(['Shift', 'X'], 'cs_tab_xx');
    addRow(['Shift', 'Z'], 'cs_tab_zz');
    addRow(['Shift', 'R'], 'cs_tab_rr');
    addRow(['Shift', 'M'], 'cs_tab_mm');
    addRow(['Shift', 'G'], 'cs_tab_gg');
    addRow(['Shift', 'T'], 'cs_tab_tt');
    addRow(['Shift', 'W'], 'cs_tab_ww');
    addRow(['Shift', 'S'], 'cs_tab_ss');
    addRow(['Shift', 'A'], 'cs_tab_aa');
    addRow(['Shift', 'D'], 'cs_tab_dd');

    addSection('cs_section_sys');
    addRow(['Shift', 'P'], 'cs_sys_shift_p');
    addRow(['F'], 'cs_sys_f');
    addRow(['Z'], 'cs_sys_z');
    addRow(['Alt', 'Z'], 'cs_sys_altz');

    panel.appendChild(table);

    const footer = document.createElement('div');
    footer.id = 'footer';
    footer.textContent = t('cs_footer');
    panel.appendChild(footer);

    overlay.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(overlay);

    let visible = false;

    function mount(): void {
        if (document.body) {
            document.body.appendChild(host);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(host), { once: true });
        }
    }

    let csHideTimer: ReturnType<typeof setTimeout> | null = null;

    function show(): void {
        if (csHideTimer !== null) { clearTimeout(csHideTimer); csHideTimer = null; }
        visible = true;
        host.style.display = 'flex';
        requestAnimationFrame(() => panel.classList.add('visible'));
    }

    function hide(): void {
        visible = false;
        panel.classList.remove('visible');
        csHideTimer = setTimeout(() => { if (!visible) host.style.display = 'none'; }, 240);
    }

    function toggle(): void { visible ? hide() : show(); }
    function isVisible(): boolean { return visible; }

    mount();
    return { toggle, hide, isVisible };
})();

window.addEventListener('XOpsWalker_ToggleCheatsheet', () => {
    cheatsheet.toggle();
});

// ── Deep Blur ──────────────────────────────────────────────────────────
function deepBlur(root: Element | null): void {
    if (!root) return;
    let el: Element | null = root;
    while (el?.shadowRoot?.activeElement) {
        el = el.shadowRoot.activeElement;
    }
    if (el instanceof HTMLElement && el !== document.body) {
        el.blur();
    }
}

function blurActiveInput(): void {
    deepBlur(document.activeElement);
    window.focus();
}

function normalizeKey(event: KeyboardEvent): string {
    const code = event.code;
    if (code.startsWith('Key')) return code.slice(3).toLowerCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'Space') return ' ';
    return event.key.toLowerCase();
}

// ── P3: メインキーダウンリスナー ──────────────────────────────────────────────
function keydownHandler(event: KeyboardEvent): void {
    // ── P1: Orphan（亡霊）フェイルセーフ ──
    if (isOrphan()) return;

    // 【追加】Middleware: SafetyEnter (絶対的パススルーより前に判定・迎撃)
    if (interceptSafetyEnter(event)) return;

    // ── Alt+Z: 緊急フォーカス奪還 ──
    if (isWalkerMode && event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyZ') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        deepBlur(document.activeElement);
        document.body.focus();
        window.focus();

        window.dispatchEvent(new CustomEvent('x-ops-global-reset'));

        const container = getBestScrollContainer(event);
        router.dispatch(event, 'z', event.shiftKey, container);
        return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【絶対的パススルー層】
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (shouldPassThrough(event)) return;

    if (document.fullscreenElement !== null && event.key === 'Escape') return;

    const key = normalizeKey(event);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【Opt-in Block 層】
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (event.key === 'Escape') {
        if (cheatsheet.isVisible()) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            cheatsheet.hide();
        }
        return;
    }

    if (event.code === 'KeyP' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
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

window.addEventListener('keydown', keydownHandler, { capture: true });

// ── P2: 初期化 ────────────────────────────────────────────────────────
safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!result[BLOCKER_KEY]);
});

// ── X Timeline Walker (v2.1) 初期化判定 ──────────────────────────────────────
const currentHost = window.location.hostname;
if (currentHost === 'x.com' || currentHost === 'twitter.com') {
    safeStorageGet(['xWalker'], (res) => {
        const xWalker = (res.xWalker as any) ?? { enabled: true, rightColumnDashboard: true };
        if (xWalker.enabled) {
            initXWalker(xWalker);
        }
    });
}

// ── P2: ストレージ変更監視 ───────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (STORAGE_KEY in changes) {
        isWalkerMode = !!changes[STORAGE_KEY].newValue;
        hud.setState(isWalkerMode);
        if (isWalkerMode && !document.hidden) blurActiveInput();
    }

    if (BLOCKER_KEY in changes) {
        applyOneTapBlocker(!!changes[BLOCKER_KEY].newValue);
    }
});

// ── FORCE_BLUR_ON_ARRIVAL + MARK_SLEEPING ───────────────────────────
chrome.runtime.onMessage.addListener((message: { command: string }) => {
    if (message.command === 'FORCE_BLUR_ON_ARRIVAL') {
        if (!isWalkerMode) return;
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        window.focus();
        return;
    }

    if (message.command === 'MARK_SLEEPING') {
        if (!document.title.startsWith('💤 ')) {
            document.title = '💤 ' + document.title;
        }
    }
});

// ── 🛡️ Active Focus Shield ─────────────────
const FocusShield = (() => {
    let shieldTimer: ReturnType<typeof setTimeout> | null = null;
    let isActive = false;

    function dropShield(): void {
        if (!isActive) return;
        isActive = false;
        if (shieldTimer) {
            clearTimeout(shieldTimer);
            shieldTimer = null;
        }
        window.removeEventListener('focusin', interceptFocus, true);
        window.removeEventListener('mousedown', dropShield, true);
        window.removeEventListener('keydown', dropShield, true);
    }

    function interceptFocus(e: FocusEvent): void {
        if (!isWalkerMode) return;
        const target = e.target as Element;
        if (!target) return;

        if (isEditableElement(target) || isSensitiveElement(target)) {
            e.preventDefault();
            (target as HTMLElement).blur();
            document.body.focus();
        }
    }

    function activate(): void {
        if (!isWalkerMode) return;
        dropShield();

        blurActiveInput();

        isActive = true;
        window.addEventListener('focusin', interceptFocus, true);
        window.addEventListener('mousedown', dropShield, true);
        window.addEventListener('keydown', dropShield, true);

        shieldTimer = setTimeout(dropShield, 1500);
    }

    return { activate, dropShield };
})();

// ── P2+P1: タブ「寝起き」状態の Pull 型同期 ──────────────────────────────────
function pullStateFromStorage(): void {
    if (!window.__XOPS_WALKER_ALIVE__) return;

    if (document.title.startsWith('💤 ')) {
        document.title = document.title.slice('💤 '.length);
    }

    safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (res) => {
        isWalkerMode = !!res[STORAGE_KEY];
        hud.setState(isWalkerMode);
        applyOneTapBlocker(!!res[BLOCKER_KEY]);

        if (isWalkerMode) {
            FocusShield.activate();
        }
    });
}

function onVisibilityChange(): void {
    if (!document.hidden) pullStateFromStorage();
}

function onWindowFocus(): void {
    pullStateFromStorage();
}

window.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('focus', onWindowFocus);

// ── ALM: Vital Heartbeat の発信源群 ─────────────────────────────────────
(function installMediaVeto() {
    let mediaVetoActive = false;

    function onMediaPlay(): void {
        if (mediaVetoActive) return;
        mediaVetoActive = true;
        safeSendMessage({ command: 'ALM_VETO' });
    }

    function onMediaPause(): void {
        const medias = document.querySelectorAll('audio, video');
        const anyPlaying = Array.from(medias).some(m => !(m as HTMLMediaElement).paused);
        if (anyPlaying) return;
        if (!mediaVetoActive) return;
        mediaVetoActive = false;
        safeSendMessage({ command: 'ALM_VETO_CLEAR' });
    }

    document.addEventListener('play', onMediaPlay, { capture: true });
    document.addEventListener('pause', onMediaPause, { capture: true });
})();

(function installInputVeto() {
    let inputVetoActive = false;

    function onInputFocus(event: FocusEvent): void {
        for (const node of event.composedPath()) {
            if (!node || (node as Node).nodeType !== 1) continue;
            const el = node as Element;
            if (el === document.body || el === document.documentElement) break;
            if (isEditableElement(el)) {
                if (!inputVetoActive) {
                    inputVetoActive = true;
                    safeSendMessage({ command: 'ALM_VETO' });
                }
                return;
            }
        }
    }

    function onInputBlur(event: FocusEvent): void {
        if (!inputVetoActive) return;
        for (const node of event.composedPath()) {
            if (!node || (node as Node).nodeType !== 1) continue;
            const el = node as Element;
            if (el === document.body || el === document.documentElement) break;
            if (isEditableElement(el)) {
                const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
                if ('value' in inputEl && (inputEl as HTMLInputElement).value.length > 0) {
                    return;
                }
                break;
            }
        }
        inputVetoActive = false;
        safeSendMessage({ command: 'ALM_VETO_CLEAR' });
    }

    document.addEventListener('focusin', onInputFocus, { capture: true });
    document.addEventListener('focusout', onInputBlur, { capture: true });
})();

connectKeepAlivePort();

// ── keyup / keypress: ホワイトリスト方式サイレントキル ───────────────────────
function suppressSiteShortcutsHandler(event: KeyboardEvent): void {
    if (isOrphan()) return;

    // 【追加】Middleware: SafetyEnter
    if (interceptSafetyEnter(event)) return;

    if (shouldPassThrough(event)) return;

    const key = normalizeKey(event);

    if (REGISTERED_ROUTER_KEYS.has(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
}

window.addEventListener('keyup', suppressSiteShortcutsHandler, { capture: true });
window.addEventListener('keypress', suppressSiteShortcutsHandler, { capture: true });