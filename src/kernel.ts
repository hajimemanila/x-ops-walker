// ============================================================================
// X-Ops Walker — kernel.ts  (Chrome MV3 Hardened)
// ============================================================================
// 設計原則:
//   P1. Orphan（亡霊）検知と自己終了
//   P2. Service Worker 完全非依存の自立した状態管理
//   P3. キャプチャフェーズ先頭での同期的イベント強奪
// ============================================================================

// ── P1: 多重注入ガード ────────────────────────────────────────────────────────
// 拡張機能のリロード時、onInstalled による再注入で「古い kernel」と「新しい
// kernel」が同一タブに共存する。グローバルフラグで先着したスクリプトが
// 後発を弾き、後発スクリプトは自分自身を即座に終了させる。
declare global {
    interface Window {
        __XOPS_WALKER_ALIVE__: boolean;
    }
}

if (window.__XOPS_WALKER_ALIVE__) {
    // 新しい kernel が注入された = 自分（今実行中の古い kernel）は役目を終えた。
    // 何もせずここで停止する。以降のコードは一切実行されない。
    // （イベントリスナーは addListener に到達していないので解除不要）
    throw new Error('[X-Ops Walker] Duplicate kernel detected. Old instance exiting silently.');
}

// このスクリプトが「生きている唯一の kernel」であることを宣言する
window.__XOPS_WALKER_ALIVE__ = true;

// ── 定数 ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'isWalkerMode';
const BLOCKER_KEY = 'blockGoogleOneTap';
const SCROLL_AMOUNT = 380;

// Walkerキー全体セット（押下時に stopImmediate を発動するトリガー）
const WALKER_KEYS = new Set([
    'a', 'd', 's', 'w', 'f', 'x', 'z', 'r', 'm', 'g', 't', '9', ' ', 'q', 'e', 'c',
]);

// Shift+キー → background へ送るコマンド
const SHIFT_ACTIONS: Record<string, string> = {
    'x': 'CLOSE_TAB',
    'z': 'UNDO_CLOSE',
    'r': 'RELOAD_TAB',
    'm': 'MUTE_TAB',
    'g': 'DISCARD_TAB',
    't': 'CLEAN_UP',
    '9': 'GO_FIRST_TAB',
    'c': 'DUPLICATE_TAB',
};

// Shift+W / Shift+S → ローカルスクロール（background 不要）
const SHIFT_LOCAL_ACTIONS: Record<string, () => void> = {
    'w': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    's': () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
};

// 無修飾キー → ローカルスクロール / background タブ移動
const NAV_ACTIONS: Record<string, () => void> = {
    'w': () => window.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' }),
    's': () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' }),
    'a': () => safeSendMessage({ command: 'PREV_TAB' }),
    'd': () => safeSendMessage({ command: 'NEXT_TAB' }),
};


// ── P1: Orphan フェイルセーフ ─────────────────────────────────────────────────
// キーダウンリスナーの先頭で必ず呼ぶ。
// 自身が「無効化されたコンテキスト（=亡霊）」になっていた場合は
// true を返し、呼び出し元はリスナーを解除して即 return する。
function isOrphan(): boolean {
    try {
        chrome.runtime.getManifest();
        return false;  // コンテキストは生きている
    } catch {
        // Extension context invalidated — 自分は亡霊
        window.removeEventListener('keydown', keydownHandler, { capture: true });
        window.__XOPS_WALKER_ALIVE__ = false;
        return true;
    }
}


// ── P1: 安全な API ラッパー群 ────────────────────────────────────────────────
// すべての chrome.* API 呼び出しはこれらのラッパー経由で行う。
// Extension context invalidated を検知した場合、エラーをコンソールに
// 出力せず、自身を静かに終了させる（亡霊の完全封鎖）。

function selfDestruct(): void {
    window.__XOPS_WALKER_ALIVE__ = false;
    window.removeEventListener('keydown', keydownHandler, { capture: true });
    window.removeEventListener('keyup', silentKillHandler, { capture: true });
    window.removeEventListener('keypress', silentKillHandler, { capture: true });
    window.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onWindowFocus);
}

// chrome.runtime.sendMessage の安全ラッパー
function safeSendMessage(msg: object): void {
    try {
        chrome.runtime.sendMessage(msg).catch((err: unknown) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (errMsg.includes('Extension context invalidated') ||
                errMsg.includes('message channel closed')) {
                selfDestruct();
                return;
            }
            // その他のエラーはデバッグ用に出力する（原因究明のため）
            console.error('[X-Ops Walker] sendMessage failed:', errMsg, msg);
        });
    } catch (e) {
        // 同期的な例外（context が既に死んでいる場合）
        console.error('[X-Ops Walker] sendMessage sync error:', e);
        selfDestruct();
    }
}

// chrome.storage.local.get の安全ラッパー
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

// chrome.storage.local.set の安全ラッパー
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


// ── i18n helper ───────────────────────────────────────────────────────────────
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
// isWalkerMode は kernel.ts 内でのみ管理する。
// Service Worker からの Push 通知（FORCE_STATE_SYNC 等）は一切受け取らない。
// 初期化時に storage から1度だけ読み込み、以降はローカルで完結させる。
let isWalkerMode = false;


// ── Security Guard: 機密入力フィールドの検出 ──────────────────────────────────
function isSensitiveElement(el: Element): boolean {
    const htmlEl = el as HTMLElement;
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password') return true;
    const ac = htmlEl.getAttribute('autocomplete') ?? '';
    if (ac.includes('password') || ac.startsWith('cc-')) return true;
    if (htmlEl.isContentEditable) return true;
    return false;
}

function isInputActive(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    if (isSensitiveElement(el)) return true;
    const tag = el.tagName.toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(tag)) return true;
    if (el.shadowRoot) {
        const inner = el.shadowRoot.activeElement;
        if (inner) {
            if (isSensitiveElement(inner)) return true;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(inner.tagName.toUpperCase())) return true;
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

    function setState(active: boolean): void {
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
        all: 'initial',
        position: 'fixed',
        inset: '0',
        zIndex: '2147483646',
        display: 'none',
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

    const panel = document.createElement('div');
    panel.id = 'panel';

    // Header
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
    addRow(['F'], 'cs_sys_f');
    addRow(['Z'], 'cs_sys_z');

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


// ── Blur on Enable ────────────────────────────────────────────────────────────
function blurActiveInput(): void {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el !== document.body) {
        el.blur();
    }
    window.focus();
}


// ── normalizeKey: 修飾キー非依存の物理キー正規化 ──────────────────────────────
function normalizeKey(event: KeyboardEvent): string {
    const code = event.code;
    if (code.startsWith('Key')) return code.slice(3).toLowerCase(); // KeyA → 'a'
    if (code.startsWith('Digit')) return code.slice(5);               // Digit9 → '9'
    if (code === 'Space') return ' ';
    return event.key.toLowerCase();
}


// ── P3: キーアクションハンドラ (完全なイベント強奪後に実行) ─────────────────
// key は呼び元（keydownHandler）にて normalizeKey で正規化済みの文字列。
// このメソッドは「P3強奪3点セットが確実に実行済み」の文脈からのみ呼ばれる。
function dispatchWalkerAction(event: KeyboardEvent, key: string): void {
    const shift = event.shiftKey;

    // Shift+キー: background 送信コマンド（タブ操作）
    if (shift && SHIFT_ACTIONS[key]) {
        safeSendMessage({ command: SHIFT_ACTIONS[key] });
        return;
    }

    // Shift+W / Shift+S: ページ先頭・末尾へスクロール
    if (shift && SHIFT_LOCAL_ACTIONS[key]) {
        SHIFT_LOCAL_ACTIONS[key]();
        return;
    }

    // F: チートシート開閉
    if (key === 'f') {
        cheatsheet.toggle();
        return;
    }

    // Space: 次タブ / Shift+Space: 前タブ
    if (key === ' ') {
        safeSendMessage({ command: shift ? 'PREV_TAB' : 'NEXT_TAB' });
        return;
    }

    // Q: 履歴戻る / E: 履歴進む
    if (key === 'q') { window.history.back(); return; }
    if (key === 'e') { window.history.forward(); return; }

    // Z (単押し): DOMフォーカスリセット + スクロール最上部へ
    // Shift+Z は上の UNDO_CLOSE で処理済み
    if (key === 'z' && !shift) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // W/S/A/D: スクロール・タブ移動
    if (!shift && NAV_ACTIONS[key]) {
        NAV_ACTIONS[key]();
    }
}


// ── P3: メインキーダウンリスナー ──────────────────────────────────────────────
// 【設計上の重要事項】
// Chromeの capture フェーズでは、Chrome 拡張の isolated world と
// ページの main world のリスナーが混在する。
// されど stopImmediatePropagation() は「同一ターゲット・同一フェーズ」内の
// 後続リスナー全てをブロックする——world の区別なく。
// つまり capture: true + stopImmediatePropagation() の組み合わせは
// GeminiやXのキャプチャリスナーすら上書きできる最強の位置取りになる。
function keydownHandler(event: KeyboardEvent): void {
    // ── P1: Orphan（亡霊）フェイルセーフ ────────────────────────────────────
    // extension context が無効化されているなら、即座にリスナーを解除して終了。
    if (isOrphan()) return;

    // 修飾キー単独はスキップ
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;

    // キーリピートはスキップ（長押しの連射を防ぐ）
    if (event.repeat) return;

    // フルスクリーン中の Escape はブラウザに委ねる
    if (document.fullscreenElement !== null && event.key === 'Escape') return;

    // ── キー正規化: event.code ベースで修飾キー非依存な小文字キーを取得 ────────
    // event.code は Shift/Alt 修飾の影響を受けない（Shift+'g' → code='KeyG' → 'g')
    // Digit9 → '9'（Shift+'9' でも code='Digit9' のまま）などを正確に取り扱うため
    // event.key.toLowerCase() ではなく必ず normalizeKey を使用する。
    // この一度の計算を WALKER_KEYS 判定と dispatchWalkerAction の両方で共有する。
    const key = normalizeKey(event);

    // ── Escape: チートシート閉じる or Walker トグル ──────────────────────────
    // Escape は Walker OFF 状態でも必ず捕捉する（チートシートを閉じるため）。
    // P3強奪3点セットを先に実行してからロジックに入る。
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (cheatsheet.isVisible()) {
            cheatsheet.hide();
            return;
        }

        // P2: ローカル変数のみで状態を管理し、storage に Push するだけ
        isWalkerMode = !isWalkerMode;
        safeStorageSet({ [STORAGE_KEY]: isWalkerMode });
        hud.setState(isWalkerMode);
        if (isWalkerMode) blurActiveInput();
        return;
    }

    // Walker OFF または入力中はここで終了（強奪もしない）
    if (!isWalkerMode || isInputActive()) return;

    // ── P3: 絶対的イベント強奪 ───────────────────────────────────────────────
    // Walker キーと判定された瞬間、非同期処理（sendMessage等）より前に
    // 同期的に3つを全て実行する。サイト側のリスナーへの伝播を完全に遮断する。
    if (WALKER_KEYS.has(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        // ↑ この3行はいかなる非同期処理・条件分岐よりも先に実行される

        // key はハンドラ先頭で済みの正規化値をそのまま渡す（二重計算なし）
        dispatchWalkerAction(event, key);
    }
}

// capture: true — DOMツリーのキャプチャフェーズ最上流でイベントを捕捉する
window.addEventListener('keydown', keydownHandler, { capture: true });


// ── P2: 初期化 — ストレージから1回だけ状態を読み込む ──────────────────────────
// Service Worker の生死に関係なく、storage は独立したKVストアとして常に利用可能。
// onInstalled による再注入後も、ここで正しいモード状態が復元される。
safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!result[BLOCKER_KEY]);
});

// ── P2: ストレージ変更監視 ───────────────────────────────────────────────────
// 2つの役割を担う:
//   (A) ポップアップ（別コンテキスト）からのトグル操作をリアルタイムで反映する
//   (B) 「競合状態（Race Condition）」の根本解決:
//       Space/A/D でタブ移動した直後、移動先タブの isWalkerMode は古い値のままになる。
//       onChanged は非アクティブタブにも発火するため、pull した pull より
//       先に isWalkerMode を正しい値に更新できる（非同期 Pull のタイムラグを排除）。
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (STORAGE_KEY in changes) {
        isWalkerMode = !!changes[STORAGE_KEY].newValue;
        hud.setState(isWalkerMode);
        // バックグラウンドタブが window.focus() を呼んでタブが切り替わる問題を防ぐ
        if (isWalkerMode && !document.hidden) blurActiveInput();
    }

    if (BLOCKER_KEY in changes) {
        applyOneTapBlocker(!!changes[BLOCKER_KEY].newValue);
    }
});

// ── FORCE_BLUR_ON_ARRIVAL: タブ切り替え到着時のフォーカス制御 ────────────────
// background.ts の sendArrivalBlur() からのみ受け取る。
// ★ FORCE_STATE_SYNC 等の状態管理Push通知は意図的に一切実装しない (P2)
chrome.runtime.onMessage.addListener((message: { command: string }) => {
    if (message.command !== 'FORCE_BLUR_ON_ARRIVAL') return;
    if (!isWalkerMode) return;

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    window.focus();
});

// ── P2+P1: タブ「寝起き」状態の Pull 型同期 ──────────────────────────────────
// 問題: タブが非アクティブ（frozen/discarded）状態から復帰した直後、
// chrome.storage.onChanged は発火しないため isWalkerMode が古い値のままになる。
// 解決: visibilitychange と focus の両方でストレージをプル（Pull）し直す。
// これにより Space/A/D キーでのタブ移動直後でもキーバインドが即座に機能する。
function pullStateFromStorage(): void {
    // 亡霊チェック: Orphan になっていたら同期も不要
    if (!window.__XOPS_WALKER_ALIVE__) return;

    // 💤 自動浄化 — 目覚めたタブのタイトルから "💤 " プレフィックを剥ぎ取る
    // background.ts の DISCARD_TAB で discard 前に付与された識別子をクリーンアップする
    if (document.title.startsWith('💤 ')) {
        document.title = document.title.slice('💤 '.length);
    }

    safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (result) => {
        isWalkerMode = !!result[STORAGE_KEY];
        hud.setState(isWalkerMode);
        applyOneTapBlocker(!!result[BLOCKER_KEY]);
    });
}

function onVisibilityChange(): void {
    // document.hidden === false = タブが前景に来た
    if (!document.hidden) pullStateFromStorage();
}

function onWindowFocus(): void {
    // focus イベントは visibilitychange より早く発火することがあるため両方登録する
    pullStateFromStorage();
}

window.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('focus', onWindowFocus);

// ── P3追加: keyup / keypress のサイレントキル（三段防壁）───────────────────────
// 問題: Gemini 等のサイトは keydown ではなく keyup や keypress でショートカットを
//       発火させる場合がある。keydown だけ握りつぶしても keyup/keypress が漏れると
//       サイト側ハンドラが動いてしまう。
// 解決: Walker ON かつ WALKER_KEYS のキーであれば、keyup/keypress も
//       キャプチャフェーズの最上流で3点セットを実行し、アクションは一切行わず
//       ただ「握りつぶす」だけにする（サイレントキル）。
// 注意: keypress は非推奨だが、レガシーサイト対策として引き続き登録する。
function silentKillHandler(event: KeyboardEvent): void {
    // P1: 亡霊チェック
    if (isOrphan()) return;

    // Walker OFF なら一切介入しない
    if (!isWalkerMode) return;

    // ── 入力欄ガード（絶対原則）────────────────────────────────────────────────
    // テキスト入力中はWalkerを完全に無効化し、ブラウザの標準動作に委ねる。
    // event.target ベースで判定（shadow DOM 内の activeElement も isInputActive でカバー）
    const target = event.target as HTMLElement;
    const isTargetInput = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
    if (isTargetInput || isInputActive()) return;

    // 修飾キー単独・リピートはスキップ
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;
    if (event.repeat) return;

    const key = normalizeKey(event);

    // WALKER_KEYS に含まれるキーならサイレントキル（アクション実行なし）
    if (WALKER_KEYS.has(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        // ↑ Geminiや X のサイト側 keyup/keypress リスナーへの伝播を完全遮断
        // dispatchWalkerAction は呼ばない（keydown で実行済み）
    }
}

// keyup / keypress ともにキャプチャフェーズの最上流（window）に配備する
window.addEventListener('keyup', silentKillHandler, { capture: true });
window.addEventListener('keypress', silentKillHandler, { capture: true });