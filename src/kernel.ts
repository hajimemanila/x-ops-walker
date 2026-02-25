'use strict';

const STORAGE_KEY = 'isWalkerMode';
const SCROLL_AMOUNT = 380;
const DOUBLE_TAP_DELAY = 250;

const WALKER_KEYS = new Set(['a', 'd', 's', 'w', 'f', 'x', 'z', 'r', 'm', 'g', '0', ' ']);

// ── State ─────────────────────────────────────────────────────────────────────
let isWalkerMode = false;
let lastKey: string | null = null;
let lastKeyTime = 0;

// ── i18n helper ───────────────────────────────────────────────────────────────
function t(key: string): string {
    const msg = browser.i18n.getMessage(key);
    return msg || key; // キーが見つからない場合はキー文字列をフォールバック
}

// ── Input guard ───────────────────────────────────────────────────────────────
function isInputActive(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(tag)) return true;
    if ((el as HTMLElement).isContentEditable) return true;
    if (el.shadowRoot) {
        const inner = el.shadowRoot.activeElement;
        if (inner) {
            const innerTag = inner.tagName.toUpperCase();
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(innerTag)) return true;
            if ((inner as HTMLElement).isContentEditable) return true;
        }
    }
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
    .icon { font-size: 16px; line-height: 1; }
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
    // i18n: HUDのラベル・ステータスを messages.json から取得
    hudEl.innerHTML = `<span class="icon">🦊</span><span class="label">${t('hud_label')}</span><span class="status off">${t('hud_off')}</span>`;

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

    function setState(active: boolean): void {
        if (active) {
            hudEl.classList.add('visible');
            statusEl.className = 'status on';
            statusEl.textContent = t('hud_on');
            triggerPulse();
        } else {
            hudEl.classList.remove('visible');
            statusEl.className = 'status off';
            statusEl.textContent = t('hud_off');
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
        all: 'initial',
        position: 'fixed',
        inset: '0',
        zIndex: '2147483646',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    });

    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
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
      min-width: 380px;   /* 英語の長い文字列に対応 */
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
    #header .icon  { font-size: 18px; }
    #header .title { font-size: 13px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(255, 255, 255, 0.85); }
    #header .badge { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffac30; background: rgba(255, 140, 0, 0.15); border-radius: 999px; padding: 2px 8px; }
    table { width: 100%; border-collapse: collapse; }
    tr + tr td { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    td { padding: 7px 4px; font-size: 12px; color: rgba(255, 255, 255, 0.55); vertical-align: middle; }
    td.key-col { width: 110px; white-space: nowrap; } /* 英語キーラベルに対応して拡張 */
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

    const overlay = document.createElement('div');
    overlay.id = 'overlay';

    // i18n: チートシートの全文字列を messages.json から取得して構築
    const panel = document.createElement('div');
    panel.id = 'panel';
    panel.innerHTML = `
    <div id="header">
      <span class="icon">🦊</span>
      <span class="title">Fox Walker</span>
      <span class="badge">${t('cs_badge')}</span>
    </div>
    <table>
      <tr><td class="section-label" colspan="2">${t('cs_section_nav')}</td></tr>
      <tr>
        <td class="key-col"><span class="key">A</span><span class="key">D</span></td>
        <td class="desc">${t('cs_nav_ad')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">Space</span></td>
        <td class="desc">${t('cs_nav_space')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">W</span><span class="key">S</span></td>
        <td class="desc">${t('cs_nav_ws')}</td>
      </tr>

      <tr><td class="section-label" colspan="2">${t('cs_section_tab')}</td></tr>
      <tr>
        <td class="key-col"><span class="key">X</span><span class="key">X</span></td>
        <td class="desc">${t('cs_tab_xx')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">Z</span><span class="key">Z</span></td>
        <td class="desc">${t('cs_tab_zz')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">R</span><span class="key">R</span></td>
        <td class="desc">${t('cs_tab_rr')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">M</span><span class="key">M</span></td>
        <td class="desc">${t('cs_tab_mm')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">G</span><span class="key">G</span></td>
        <td class="desc">${t('cs_tab_gg')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">0</span><span class="key">0</span></td>
        <td class="desc">${t('cs_tab_00')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">L</span><span class="key">L</span></td>
        <td class="desc">${t('cs_tab_ll')}</td>
      </tr>

      <tr><td class="section-label" colspan="2">${t('cs_section_sys')}</td></tr>
      <tr>
        <td class="key-col"><span class="key">Esc</span></td>
        <td class="desc">${t('cs_sys_esc')}</td>
      </tr>
      <tr>
        <td class="key-col"><span class="key">F</span></td>
        <td class="desc">${t('cs_sys_f')}</td>
      </tr>
    </table>
    <div id="footer">${t('cs_footer')}</div>
  `;

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

    function show(): void {
        visible = true;
        overlay.style.pointerEvents = 'auto';
        panel.classList.add('visible');
    }

    function hide(): void {
        visible = false;
        overlay.style.pointerEvents = 'none';
        panel.classList.remove('visible');
    }

    function toggle(): void { visible ? hide() : show(); }
    function isVisible(): boolean { return visible; }

    mount();
    return { toggle, hide, isVisible };
})();

// ── Storage logic ─────────────────────────────────────────────────────────────
browser.storage.local.get(STORAGE_KEY).then((result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEY in changes)) return;
    isWalkerMode = !!changes[STORAGE_KEY].newValue;
    hud.setState(isWalkerMode);
});

// ── Key handler: 実際の機能分岐 ───────────────────────────────────────────────
function handleKeyInput(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const shift = event.shiftKey;
    const currentTime = Date.now();
    const isDoubleTap = (key === lastKey && (currentTime - lastKeyTime) < DOUBLE_TAP_DELAY);

    if (!isDoubleTap) {
        lastKey = key;
        lastKeyTime = currentTime;
    } else {
        lastKey = null;
    }

    const doubleActions: Record<string, string> = {
        'g': 'DISCARD_TAB', 'x': 'CLOSE_TAB', 'z': 'UNDO_CLOSE',
        '0': 'CLEAN_UP', '9': 'GO_FIRST_TAB', 'm': 'MUTE_TAB',
        'r': 'RELOAD_TAB'
    };

    if (isDoubleTap && key === 'l') {
        event.preventDefault();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', keyCode: 117, bubbles: true }));
        return;
    }

    if (isDoubleTap && doubleActions[key]) {
        event.preventDefault();
        browser.runtime.sendMessage({ command: doubleActions[key] });
        return;
    }

    if (key === 'f') {
        event.preventDefault();
        cheatsheet.toggle();
        return;
    }

    const navActions: Record<string, () => void> = {
        'w': () => window.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' }),
        's': () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' }),
        'a': () => browser.runtime.sendMessage({ command: 'PREV_TAB' }),
        'd': () => browser.runtime.sendMessage({ command: 'NEXT_TAB' }),
        ' ': () => browser.runtime.sendMessage({ command: shift ? 'PREV_TAB' : 'NEXT_TAB' })
    };

    if (navActions[key]) {
        event.preventDefault();
        navActions[key]();
    }
}

// ── メインリスナー（capture: true で最優先取得）────────────────────────────────
window.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;
    if (event.repeat) return;

    if (document.fullscreenElement !== null && event.key === 'Escape') return;

    if (event.key === 'Escape') {
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