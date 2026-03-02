const SCROLL_AMOUNT = 380;

const WALKER_KEYS = new Set(['a', 'd', 's', 'w', 'f', 'h', 'x', 'z', 'r', 'm', 'g', 't', '9', ' ', 'q', 'e', 'c']);

// Shift+キー: background 送信アクション（旧: ダブルタップ）
const SHIFT_ACTIONS: Record<string, string> = {
    'x': 'CLOSE_TAB', 'z': 'UNDO_CLOSE', 'r': 'RELOAD_TAB',
    'm': 'MUTE_TAB', 'g': 'DISCARD_TAB', 't': 'CLEAN_UP',
    '9': 'GO_FIRST_TAB', 'c': 'DUPLICATE_TAB',
};

// Shift+W / Shift+S: ローカルスクロール（送信不要）
const SHIFT_LOCAL_ACTIONS: Record<string, () => void> = {
    'w': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    's': () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
};

const NAV_ACTIONS: Record<string, () => void> = {
    'w': () => window.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' }),
    's': () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' }),
    'a': () => browser.runtime.sendMessage({ command: 'PREV_TAB' }),
    'd': () => browser.runtime.sendMessage({ command: 'NEXT_TAB' }),
};


// ── Google One Tap 迎撃CSS ──────────────────────────────────────────────────────
// Google One Tap iframe によるフォーカス強奪を防ぎ、
// X-Ops Walker のキーバインドを死守するための迎撃 CSS。
// ストレージ設定に応じて動的に有効/無効を切り替える。デフォルト OFF。

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



// ── State ─────────────────────────────────────────────────────────────────────
let isWalkerMode = false;

// ── i18n helper ───────────────────────────────────────────────────────────────
function t(key: string): string {
    const msg = browser.i18n.getMessage(key);
    return msg || key;
}

// ── Security Guard Clause (Input Guard) ──────────────────────────────────────
// キーロガーの疑念を払拭し、機密入力時の意図しないスクロールを防止するため、
// パスワード・クレジットカード・contentEditable 要素ではキー処理を一切行わず即座に return する。
function isSensitiveElement(el: Element): boolean {
    const htmlEl = el as HTMLElement;

    // type="password" — 最優先ガード
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password') return true;

    // autocomplete に "password" または "cc-" プレフィックスが含まれる要素
    // （標準 INPUT 以外のカスタム要素でも確実にガードする）
    const ac = htmlEl.getAttribute('autocomplete') ?? '';
    if (ac.includes('password') || ac.startsWith('cc-')) return true;

    // isContentEditable — テキスト編集中の可能性があるため除外
    if (htmlEl.isContentEditable) return true;

    return false;
}

function isInputActive(): boolean {
    const el = document.activeElement;
    if (!el) return false;

    // Security Guard Clause: 機密フィールドでは即座に処理を中断
    if (isSensitiveElement(el)) return true;

    const tag = el.tagName.toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(tag)) return true;

    if (el.shadowRoot) {
        const inner = el.shadowRoot.activeElement;
        if (inner) {
            if (isSensitiveElement(inner)) return true;
            const innerTag = inner.tagName.toUpperCase();
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(innerTag)) return true;
        }
    }
    return false;
}

// ── HUD (Shadow DOM) ──────────────────────────────────────────────────────────
interface HudController {
    setState(active: boolean): void;
    setPhantomState(isPhantom: boolean): void;
}

const hud: HudController = (() => {
    const host = document.createElement('div');
    host.id = 'x-ops-walker-host';
    Object.assign(host.style, {
        all: 'initial', position: 'fixed', zIndex: '2147483647',
        pointerEvents: 'none', bottom: '24px', right: '24px',
        display: 'none',  // 初期状態: レイアウトツリーから完全除外
    });

    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
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

    const hudEl = document.createElement('div');
    hudEl.id = 'x-ops-hud';

    // DOM 操作で構築（innerHTML 回避）
    const iconImg = document.createElement('img');
    iconImg.src = browser.runtime.getURL('icons/icon48.png');
    iconImg.className = 'icon';
    iconImg.alt = '';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'hud-label';
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

    function setState(active: boolean): void {
        if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; }
        if (active) {
            host.style.display = 'block';   // レイアウトツリーに復帰してからアニメ
            hudEl.classList.add('visible');
            statusEl.className = 'status on';
            statusEl.textContent = t('hud_on');
            triggerPulse();
        } else {
            hudEl.classList.remove('visible');
            statusEl.className = 'status off';
            statusEl.textContent = t('hud_off');
            // フェードアウト完了待機後にレイアウトツリーから完全除外
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

    function setPhantomState(isPhantom: boolean): void {
        if (isPhantom) {
            hudEl.style.setProperty('border', '2px solid #a855f7', 'important');
            hudEl.style.setProperty('box-shadow', '0 0 15px #a855f7', 'important');
            labelSpan.textContent = '🎮 PHANTOM';
            labelSpan.style.setProperty('color', '#a855f7', 'important');
            statusSpan.textContent = 'ACTIVE';
            statusSpan.style.setProperty('background', 'rgba(168, 85, 247, 0.25)', 'important');
            statusSpan.style.setProperty('color', '#a855f7', 'important');
            statusSpan.style.setProperty('box-shadow', '0 0 14px rgba(168, 85, 247, 0.35)', 'important');
            iconImg.style.setProperty('filter', 'hue-rotate(270deg) drop-shadow(0 0 6px rgba(168,85,247,0.6))', 'important');

            host.style.display = 'block';
            hudEl.classList.add('visible');
            hudEl.style.opacity = '1';
        } else {
            hudEl.style.removeProperty('border');
            hudEl.style.removeProperty('box-shadow');
            labelSpan.textContent = t('hud_label');
            labelSpan.style.removeProperty('color');
            statusSpan.style.removeProperty('background');
            statusSpan.style.removeProperty('color');
            statusSpan.style.removeProperty('box-shadow');
            iconImg.style.removeProperty('filter');

            // Revert state back to current Walker Mode status
            setState(isWalkerMode);
        }
    }

    mount();
    return { setState, setPhantomState };
})();

// ── Cheatsheet (Shadow DOM) ───────────────────────────────────────────────────
interface CheatsheetController {
    toggle(mode: 'global' | 'domain'): void;
    hide(): void;
    isVisible(): boolean;
}

const cheatsheet: CheatsheetController = (() => {
    const host = document.createElement('div');
    host.id = 'x-ops-walker-cheatsheet';
    Object.assign(host.style, {
        all: 'initial',
        position: 'fixed',
        inset: '0',
        zIndex: '2147483646',
        display: 'none',          // 初期状態: DOMに存在するがレイアウトツリー外
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

    const overlay = document.createElement('div');
    overlay.id = 'overlay';

    // ── パネルを DOM 操作で構築（innerHTML 回避）────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'panel';

    // Header
    const header = document.createElement('div');
    header.id = 'header';
    const hIcon = document.createElement('img');
    hIcon.src = browser.runtime.getURL('icons/icon48.png');
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

    // Table helpers
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

    // Footer
    const footer = document.createElement('div');
    footer.id = 'footer';
    panel.appendChild(footer);

    function renderTable(mode: 'global' | 'domain'): void {
        table.innerHTML = '';
        const host = window.location.hostname;

        if (mode === 'domain') {
            footer.textContent = t('cheatsheet_close_domain');
            if (host === 'x.com' || host === 'twitter.com') {
                hTitle.textContent = t('cheatsheet_title_x');
                addSection('cs_phantom_section');
                addRow(['J', 'K'], 'cs_x_jk');
                addRow(['L'], 'cs_x_l');
                addRow(['O'], 'cs_x_o');
                addRow(['Backspace'], 'cs_x_backspace');
                addRow(['N'], 'cs_x_n_star');
                addRow(['M'], 'cs_x_m_star');
                addRow(['Y'], 'cs_x_y_profile');
            } else if (host === 'gemini.google.com') {
                hTitle.textContent = t('cheatsheet_title_gemini');
                addSection('cs_phantom_section');
                // Placeholder Gemini shortcuts
                addRow(['Coming'], 'cs_nav_space');
            } else {
                hTitle.textContent = t('extension_name');
                addSection('cs_phantom_section');
                addRow(['-'], 'cheatsheet_no_domain');
            }
        } else {
            hTitle.textContent = t('extension_name');
            footer.textContent = t('cheatsheet_close_global');

            addSection('cs_section_nav');
            addRow(['A', 'D'], 'cs_nav_ad');
            addRow(['Space'], 'cs_nav_space');
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
            addRow(['Shift', 'C'], 'cs_tab_cc');

            addSection('cs_section_sys');
            addRow(['Esc'], 'cs_sys_esc');
            addRow(['Shift', 'P'], 'cs_x_shift_p');
            addRow(['F'], 'cs_sys_f');
            addRow(['Z'], 'cs_sys_z');
            addRow(['P', '(Phantom)'], 'cs_x_p_toggle');
        }
    }

    panel.insertBefore(table, footer);

    overlay.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(overlay);

    let visible = false;
    let currentMode: 'global' | 'domain' | null = null;

    function mount(): void {
        if (document.body) {
            document.body.appendChild(host);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(host), { once: true });
        }
    }

    let csHideTimer: ReturnType<typeof setTimeout> | null = null;

    function show(mode: 'global' | 'domain'): void {
        currentMode = mode;
        renderTable(mode);
        if (csHideTimer !== null) { clearTimeout(csHideTimer); csHideTimer = null; }
        visible = true;
        host.style.display = 'flex';  // ファーストにレイアウトツリーに復帰
        requestAnimationFrame(() => panel.classList.add('visible'));
    }

    function hide(): void {
        visible = false;
        currentMode = null;
        panel.classList.remove('visible');
        // パネルのフェードアウト後に host をレイアウトツリーから完全除外
        csHideTimer = setTimeout(() => { if (!visible) host.style.display = 'none'; }, 240);
    }

    function toggle(mode: 'global' | 'domain'): void {
        if (visible && currentMode === mode) {
            hide();
        } else {
            show(mode);
        }
    }

    function isVisible(): boolean { return visible; }

    window.addEventListener('x-ops-global-reset', () => {
        if (visible) hide();
    });
    mount();
    return { toggle, hide, isVisible };
})();

// ── Blur on Enable ヘルパー ───────────────────────────────────────────────────
// 入力欄にフォーカスが残ったまま Walker Mode が ON になった際に、
// 入力欄からフォーカスを強制的に外して操作の主導権を取り戻す。
function blurActiveInput(): void {
    const el = document.activeElement;
    // body は「フォーカスなし」のデフォルト状態なのでスキップ
    if (el instanceof HTMLElement && el !== document.body) {
        el.blur();
    }
    window.focus();
}

// ── Storage logic ─────────────────────────────────────────────────────────────
browser.storage.local.get(['global']).then((result) => {
    const globalConfig = result.global || {};
    isWalkerMode = !!globalConfig.walkerMode;
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!globalConfig.oneTap);  // デフォルト false (OFF)
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('global' in changes) {
        const newVal = changes.global.newValue || {};
        const oldVal = changes.global.oldValue || {};

        if (newVal.walkerMode !== oldVal.walkerMode) {
            isWalkerMode = !!newVal.walkerMode;
            hud.setState(isWalkerMode);
            // ポップアップから ON にした際も入力欄ブラーを発火
            if (isWalkerMode && !document.hidden) blurActiveInput();
            window.dispatchEvent(new CustomEvent('x-ops-global-reset'));
        }

        if (newVal.oneTap !== oldVal.oneTap) {
            applyOneTapBlocker(!!newVal.oneTap);
        }
    }
});

// ── Arrival Override リスナー（Background → Kernel）────────────────────────────
// タブ到着直後にバックグラウンドから FORCE_BLUR_ON_ARRIVAL が送られてくる。
// Walker Mode が無効な場合は何もしない（ユーザーの意図しないフォーカス奪取防止）。
browser.runtime.onMessage.addListener((message: { command: string }) => {
    if (message.command !== 'FORCE_BLUR_ON_ARRIVAL') return;
    if (!isWalkerMode) return;  // Walker OFF 時は完全無視

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    window.focus();
});

// ── Phantom State Custom Event Listener ───────────────────────────────────────
window.addEventListener('x-ops-state-change', ((e: CustomEvent<{ isPhantom: boolean }>) => {
    if (e.detail && typeof e.detail.isPhantom === 'boolean') {
        hud.setPhantomState(e.detail.isPhantom);
    }
}) as EventListener);

// ── normalizeKey: 修飾キーに依存しない物理キーの正規化 ────────────────────────
// event.key は Shift押下時に記号文字に変化する（Shift+0→')'、Shift+9→'('等）。
// event.code （キーボード配列/修飾キー非依存）で物理キー名を得る。
function normalizeKey(event: KeyboardEvent): string {
    const code = event.code;
    if (code.startsWith('Key')) return code.slice(3).toLowerCase(); // KeyA → 'a'
    if (code.startsWith('Digit')) return code.slice(5);               // Digit0 → '0'
    if (code === 'Space') return ' ';
    return event.key.toLowerCase(); // その他は event.key にフォールバック
}

// ── Key handler ───────────────────────────────────────────────────────────────
function handleKeyInput(event: KeyboardEvent): void {
    const key = normalizeKey(event); // event.code ベースの正規化キー
    const shift = event.shiftKey;

    // Shift+キー: タブ操作（background 送信コマンド）
    if (shift && SHIFT_ACTIONS[key]) {
        event.preventDefault();
        event.stopPropagation();
        browser.runtime.sendMessage({ command: SHIFT_ACTIONS[key] });
        return;
    }

    // Shift+W / Shift+V: ページ先頭・末尾へスクロール
    if (shift && SHIFT_LOCAL_ACTIONS[key]) {
        event.preventDefault();
        event.stopPropagation();
        SHIFT_LOCAL_ACTIONS[key]();
        return;
    }

    // F: チートシート (global) 開閉
    if (key === 'f') {
        event.preventDefault();
        cheatsheet.toggle('global');
        return;
    }

    // H: チートシート (domain) 開閉
    if (key === 'h') {
        event.preventDefault();
        cheatsheet.toggle('domain');
        return;
    }

    // Space: 次タブ / Shift+Space: 前タブ
    if (key === ' ') {
        event.preventDefault();
        browser.runtime.sendMessage({ command: shift ? 'PREV_TAB' : 'NEXT_TAB' });
        return;
    }

    // Q: 履歴戻る / E: 履歴進む
    if (key === 'q') { event.preventDefault(); window.history.back(); return; }
    if (key === 'e') { event.preventDefault(); window.history.forward(); return; }

    // Z (単押し): DOMリセット (グローバル)
    if (key === 'z' && !shift) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.focus();
        window.dispatchEvent(new CustomEvent('x-ops-global-reset'));
        return;
    }

    // W/S/A/D: スクロール ・ タブ移動（Shiftなし）
    if (!shift && NAV_ACTIONS[key]) {
        event.preventDefault();
        NAV_ACTIONS[key]();
    }
}

// ── メインリスナー（capture: true で最優先取得）────────────────────────────────
window.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;
    if (event.repeat) return;

    if (document.fullscreenElement !== null && event.key === 'Escape') return;

    if (event.key === 'Escape' || (event.key.toLowerCase() === 'p' && event.shiftKey)) {
        if (event.key === 'Escape' && cheatsheet.isVisible()) {
            cheatsheet.hide();
            return;
        }

        // Prevent default for Shift+P if it's not Escape
        if (event.key.toLowerCase() === 'p') {
            event.preventDefault();
            event.stopPropagation();
        }

        isWalkerMode = !isWalkerMode;
        browser.storage.local.get(['global']).then((res) => {
            const globalConfig = res.global || {};
            globalConfig.walkerMode = isWalkerMode;
            browser.storage.local.set({ global: globalConfig });
        });
        hud.setState(isWalkerMode);
        // Esc / Shift+P で ON になった際だけ入力欄ブラーを発火（OFF時は実行しない）
        if (isWalkerMode) blurActiveInput();
        return;
    }

    if (!isWalkerMode || isInputActive()) return;

    const key = normalizeKey(event); // 修飾キー非依存の正規化

    if (WALKER_KEYS.has(key)) {
        event.stopPropagation();
    }

    handleKeyInput(event);
}, { capture: true });