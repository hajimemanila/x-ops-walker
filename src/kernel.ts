'use strict';

const STORAGE_KEY = 'isWalkerMode';
const SCROLL_AMOUNT = 380;
const DOUBLE_TAP_DELAY = 250; // AHK版の感触に合わせた待機時間

// Fox Walker が主権を持つキー一覧
// Walker Mode ON 時、これらのキーはサイト側への伝播を封殺する
const WALKER_KEYS = new Set(['a', 'd', 's', 'w', 'f', 'x', 'z', 'r', 'm', 'g', '0', ' ']);

// ── State ─────────────────────────────────────────────────────────────────────
let isWalkerMode = false;
let lastKey: string | null = null;
let lastKeyTime = 0;

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
    .status.on { background: rgba(255, 140, 0, 0.18); color: #ffac30; box-shadow: 0 0 10px rgba(255, 140, 0, 0.25); }
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
    hudEl.innerHTML = `<span class="icon">🦊</span><span class="label">Walker Mode</span><span class="status off">OFF</span>`;

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
            statusEl.textContent = 'ON';
            triggerPulse();
        } else {
            hudEl.classList.remove('visible');
            statusEl.className = 'status off';
            statusEl.textContent = 'OFF';
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

    // ダブルタップ状態の更新
    if (!isDoubleTap) {
        lastKey = key;
        lastKeyTime = currentTime;
    } else {
        lastKey = null; // トリプルタップ防止
    }

    // ダブルタップ → background.ts へコマンド送信
    const doubleActions: Record<string, string> = {
        'g': 'DISCARD_TAB', 'x': 'CLOSE_TAB', 'z': 'UNDO_CLOSE',
        '0': 'CLEAN_UP', '9': 'GO_FIRST_TAB', 'm': 'MUTE_TAB',
        'r': 'RELOAD_TAB'
    };

    // LL: URLバーフォーカス（kernel側でF6を合成送出）
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

    // シングルタップ: ナビゲーション
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
    // 修飾キー単体・リピートは無視
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;
    if (event.repeat) return;

    // 【全画面保護】fullscreen 中の ESC はブラウザ標準の全画面解除を優先して放流
    if (document.fullscreenElement !== null && event.key === 'Escape') return;

    // ESC: Walker Mode トグル（fullscreen 中以外）
    if (event.key === 'Escape') {
        isWalkerMode = !isWalkerMode;
        browser.storage.local.set({ [STORAGE_KEY]: isWalkerMode });
        hud.setState(isWalkerMode);
        return;
    }

    // Walker Mode OFF または入力フォーム中は介入しない
    if (!isWalkerMode || isInputActive()) return;

    const key = event.key.toLowerCase();

    // 【主導権の奪還】定義済みキーはサイト側への伝播を封殺してから処理
    if (WALKER_KEYS.has(key)) {
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    handleKeyInput(event);
}, { capture: true });