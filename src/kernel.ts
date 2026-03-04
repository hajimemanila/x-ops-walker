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

// ── ブラウザ判定 ───────────────────────────────────────────────────────────────
// Firefox (Gecko) と Chrome (Blink) では Shadow DOM / Alt キーの挙動が異なる。
// ブラウザごとに最適なロジックを分岐させるため、実行時に一度だけ判定する。
const isFirefox: boolean = navigator.userAgent.toLowerCase().includes('firefox');


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

// ── スクロールユーティリティ（Center Raycast + Shadow Piercing）────────────────────────────

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
    // ① Event Path 探索 (Reddit 対策)
    for (const node of event.composedPath()) {
        if (!node || (node as Node).nodeType !== 1) continue;
        const el = node as Element;
        const ov = window.getComputedStyle(el).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) {
            return el;
        }
    }

    // ② ActiveElement 探索 (Gemini/汎用対策)
    const activeC = getScrollParentPiercing(document.activeElement);
    if (activeC !== document.documentElement) return activeC;

    // ③ Center Raycast 探索 (画面中央からの逆探知・Shadow貫通の最終フォールバック)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const centerEl = getDeepElementFromPoint(centerX, centerY);
    return getScrollParentPiercing(centerEl);
}

function walkerScroll(event: KeyboardEvent, delta: number): void {
    const c = getBestScrollContainer(event);
    c.scrollBy({ top: delta, behavior: 'smooth' });
}

function resetScrollPosition(event: KeyboardEvent): void {
    const c = getBestScrollContainer(event);
    const host = window.location.hostname;
    // Zキーの AI チャット最適化 (Gemini/ChatGPT/Claude 等は最下部へ、その他は最上部へ)
    if (host.includes('gemini.google.com') || host.includes('chatgpt.com') || host.includes('claude.ai')) {
        c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    } else {
        c.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Shift+W / Shift+S → ページ先頭・末尾へスクロール
const SHIFT_LOCAL_ACTIONS: Record<string, () => void> = {
    'w': () => {
        const c = getScrollParentPiercing(document.activeElement);
        c.scrollTo({ top: 0, behavior: 'smooth' });
    },
    's': () => {
        const c = getScrollParentPiercing(document.activeElement);
        c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    },
};

// 無修飾キー → ローカルスクロール / background タブ移動
const NAV_ACTIONS: Record<string, (event: KeyboardEvent) => void> = {
    'w': (event) => walkerScroll(event, -window.innerHeight * 0.8),
    's': (event) => walkerScroll(event, window.innerHeight * 0.8),
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
    window.removeEventListener('keyup', walkerKeyUpHandler, { capture: true });
    window.removeEventListener('keypress', walkerKeyUpHandler, { capture: true });
    window.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onWindowFocus);
}

// ── Service Worker Keep-Alive Port ────────────────────────────────────────
// chrome.runtime.connect によるポート接続を終始することで SW の休止を防ぐ。
// 機能ロジック（キー判定・スクロール等）には一切触れない。
let _keepAlivePort: chrome.runtime.Port | null = null;

function connectKeepAlivePort(): void {
    // 既に接続中なら何もしない
    if (_keepAlivePort) return;
    try {
        _keepAlivePort = chrome.runtime.connect({ name: 'walker-keepalive' });
        _keepAlivePort.onDisconnect.addListener(() => {
            // SW が強制終了された場合のみここに来る。
            // 次回の safeSendMessage がリトライで復旧するため、再接続不要。
            _keepAlivePort = null;
        });
    } catch {
        // context が既に無効化されている場合（亮鬺状態）は無視
    }
}

// chrome.runtime.sendMessage の安全ラッパー（非同期・リトライ付き）
//
// Service Worker は約30秒のアイドルで休止する（MV3 仕様）。
// 休止中に sendMessage すると "Receiving end does not exist" が返る。
// SW の再起動は通常 50-200ms のため、150ms × 最大2回リトライで確実に復旧する。
//
// 亡霊エラー (Extension context invalidated / message channel closed) は
// リトライせず即座に selfDestruct() を呼ぶ — この挙動は維持する。
async function safeSendMessage(msg: object): Promise<void> {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 150;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await chrome.runtime.sendMessage(msg);
            return; // 送信成功
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);

            // 亡霊判定: 拡張機能が更新/無効化された → 即自殺、リトライ不要
            if (errMsg.includes('Extension context invalidated') ||
                errMsg.includes('message channel closed')) {
                selfDestruct();
                return;
            }

            // SW 休止判定: Service Worker が起床中 → 待機してリトライ
            if (errMsg.includes('Receiving end does not exist') && attempt < MAX_RETRIES) {
                await new Promise<void>(r => setTimeout(r, RETRY_DELAY_MS));
                continue;
            }

            // リトライ上限超過、または未知のエラー → ログして終了（ハンドラは殺さない）
            console.warn('[X-Ops Walker] sendMessage failed (final):', errMsg, msg);
            return;
        }
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
// 【設計原則】
//   - isContentEditable 継承値ではなく getAttribute('contentEditable') === 'true' で判定
//   - el が Element でない場合（テキストノード等）のクラッシュを最上段のガードで防ぐ
//   - closed Shadow DOM 対策として ARIA role ヒューリスティックを補助的に使用
//   - isInputActive はブラウザに応じて最適な判定ロジックを選択する

function isEditableElement(el: Element): boolean {
    // ── クラッシュガード: TextNode 等 Element でないノードが来た場合は即 false ──
    if (!el || (el as Node).nodeType !== 1) return false;
    // <input>, <textarea>, <select> タグは常に入力欄として扱う
    const tag = el.tagName.toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
    // contenteditable="true" が自身に明示されている要素のみ対象（継承値は無視）
    if (el.getAttribute('contentEditable') === 'true') return true;
    // ── ARIA ヒューリスティック: closed Shadow DOM 貫通不可の補完 ──────────────
    // Reddit 等の closed shadow Host は内側の <input> に到達できない。
    // ARIA role が入力欄を示す場合は Shadow Host 自体を入力欄とみなす（保守的判定）。
    const role = el.getAttribute('role') ?? '';
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox' || role === 'spinbutton') return true;
    return false;
}

function isSensitiveElement(el: Element): boolean {
    // クラッシュガード
    if (!el || (el as Node).nodeType !== 1) return false;
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password') return true;
    const ac = el.getAttribute('autocomplete') ?? '';
    if (ac.includes('password') || ac.startsWith('cc-')) return true;
    // isContentEditable（継承値）ではなく明示的属性で判定
    if (el.getAttribute('contentEditable') === 'true') return true;
    return false;
}

// ── isInputActive: composedPath 進行方向で入力欄を検知（Chrome / Firefox 共通） ───────────
//
// 【設計方針】
//   テレメトリにより、Firefox でも event.composedPath()[0] が正確に INPUT を返すことが判明。
//   以前の Firefox 失敗の原因は composedPath 自体ではなく、
//   `instanceof Element` が Xray 境界を越えず false を返しノードをスキップしていたため。
//
// 【対策】
//   `instanceof Element` の代わりに `node.nodeType !== 1` （Node.ELEMENT_NODE）を使用。
//   これは純粋な DOM プロパティアクセスであり Xray 天井を越えられるブラウザ中立な判定。
//   Chrome / Firefox / 全ステージ庖一のロジックで完結。
function isInputActive(event: KeyboardEvent): boolean {
    for (const node of event.composedPath()) {
        // nodeType≠Element（ShadowRoot, DocumentFragment, Window, Document 等）はスキップ
        // nodeType 属性は純粋な数値なので Xray 天井を越える
        if (!node || (node as Node).nodeType !== 1) continue;
        const el = node as Element;
        // body / html / window / document 垢に達したら入力欄なし
        if (el === document.body || el === document.documentElement) break;
        if (isSensitiveElement(el)) return true;
        if (isEditableElement(el)) return true;
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


// ── Deep Blur: Shadow DOM を再帰して最深層の activeElement を blur する ──────────
// Gemini 等の SPA は入力欄を closed Shadow DOM の奥深くに置くため、
// document.activeElement のみを blur() するだけでは不十分。
// 処理可能な最深の shadow activeElement を辿り回して確実に blur() する。
function deepBlur(root: Element | null): void {
    if (!root) return;
    let el: Element | null = root;
    // shadow DOM を再帰的に潜り、最深層の activeElement まで辿り着く
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

    // Z (単押し): DOMフォーカスリセット + ページ最上部/最下部へ
    // Shift+Z は上の UNDO_CLOSE で処理済み
    if (key === 'z' && !shift) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.focus();
        resetScrollPosition(event);
        return;
    }

    // W/S/A/D: スクロール・タブ移動
    if (!shift && NAV_ACTIONS[key]) {
        NAV_ACTIONS[key](event);
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
    if (isOrphan()) return;

    // ── Alt+Z: 緊急フォーカス奪還 — ハンドラ最上段で即座に発動する特権コマンド ──
    // 【全ブラウザ対応】
    //   Firefox では OS レベルの Alt メニュー干渉が DOM keydown より先に発生する場合があるが、
    //   可能な限り早いタイミングで preventDefault を呼び、寒山に字を遭える。
    //   ※ Focus Shield（自動 blur 監視）は一切含まない — 手動コマンドのみ。
    if (isWalkerMode && event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyZ') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        // Stage 1: deepBlur — Shadow DOM 最深層も対応
        deepBlur(document.activeElement);
        // Stage 2: body を掴み直して「無主フォーカス」を消滅させる
        document.body.focus();
        // Stage 3: ウィンドウフォーカスも Walker へ
        window.focus();
        // Stage 4: 単押し Z と同等のスクロールリセット
        resetScrollPosition(event);
        return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【絶対的パススルー層】
    // 以下の条件のいずれかに合致する場合は stopPropagation / preventDefault を
    // 一切呼ばずに即 return。ブラウザ標準動作（コピー・ペースト・IME 等）を完全保護。
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Walker が OFF の時は何もしない（Escape だけは後段で処理するため除外）
    if (!isWalkerMode && event.key !== 'Escape') return;

    // 修飾キー（Ctrl / Meta / Alt）が押されている場合はブラウザに委ねる
    // 例: Ctrl+C (コピー), Ctrl+V (ペースト), Alt+← (戻る) 等を保護
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // テキストが選択されている場合は干渉しない（コピー等の選択操作を保護）
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;

    // IME（日本語変換等）入力中は絶対にスリープ
    // isComposing   : 変換中（2打目以降）を確実にガード
    // key==='Process': Chrome/Edge が IME 処理中キーに付与する値（Chrome の1打目対策）
    // keyCode===229 : Firefox では IME 変換中のキーに keyCode 229 が付与される
    //                 （key は 'Process' にならないため Firefox 固有のガードとして追加）
    if (event.isComposing || event.key === 'Process' || event.keyCode === 229) return;

    // 入力欄にフォーカスがある場合は干渉しない（nodeType ベースの Xray セーフ共通判定）
    if (isInputActive(event)) return;

    // キーリピートはスキップ（長押し連射を防ぐ）
    if (event.repeat) return;

    // 修飾キー単独のキーダウンはスキップ
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;

    // フルスクリーン中の Escape はブラウザに委ねる
    if (document.fullscreenElement !== null && event.key === 'Escape') return;

    // ── キー正規化: event.code ベースで修飾キー非依存な小文字キーを取得 ────────
    const key = normalizeKey(event);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【Opt-in Block 層】
    // ここから下は「Walker が使うキーと確定した瞬間に初めて」ブロックする。
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // ── Escape: チートシート閉じる or Walker トグル ──────────────────────────
    // Walker OFF/ON どちらでも Escape だけは捕捉してチートシートを閉じる。
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

    // Walker ON 確定 & WALKER_KEYS に含まれるキー → この瞬間に初めてブロック
    if (isWalkerMode && WALKER_KEYS.has(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

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

// ── FORCE_BLUR_ON_ARRIVAL + MARK_SLEEPING: background メッセージハンドラ ───────────
// FORCE_BLUR_ON_ARRIVAL — background.ts の sendArrivalBlur() からのみ受け取る。
// MARK_SLEEPING       — background.ts の DISCARD_TAB ハンドラから受け取る。
//   → document.title に 💤 プレフィックスを付与（Chrome/Firefox 両対応）
// ★ FORCE_STATE_SYNC 等の状態管理Push通知は意図的に一切実装しない (P2)
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
        // 💤 プレフィックスの付与 — discard 前にバックグラウンドから指示される
        // content script 内で実行するので Chrome/Firefox 両方で完全動作する
        if (!document.title.startsWith('💤 ')) {
            document.title = '💤 ' + document.title;
        }
    }
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

        // ── SPA オートフォーカス潰し ───────────────────────────────────────────
        // Gemini/Keep 等の SPA はタブ復帰後に遅延で入力欄にオートフォーカスする。
        // Walker ON なら 150ms 待ってから deepBlur で上書きし、キーバインドを即座に届かせる。
        // 注意: この遅延 setTimeout は User Gesture がないため window.focus() が
        //        Chrome にブロックされる場合があるが、deepBlur 自体は実行される。
        if (isWalkerMode) {
            setTimeout(() => {
                if (!isWalkerMode) return;  // 遅延中に OFF に切り替わった場合はキャンセル
                if (!window.__XOPS_WALKER_ALIVE__) return;  // 亡霊化チェック
                blurActiveInput();
            }, 150);
        }
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

// Keep-Alive Port を開く: storage.onChanged リスナー登録後に1回だけ実行。
// 機能ロジックには一切手を触れず、通信層のみの初期化。
connectKeepAlivePort();

// ── keyup / keypress: ホワイトリスト方式サイレントキル ───────────────────────
// 問題: Gemini 等のサイトは keydown ではなく keyup や keypress でショートカットを
//       発火させる場合がある。keydown だけ握りつぶしても keyup/keypress が漏れると
//       サイト側ハンドラが動いてしまう。
// 解決: keydown と同一の「絶対的パススルー層」を最上部で評価し、
//       Walker が確実に使うキーと判定された場合のみ止める（ホワイトリスト）。
// 注意: keypress は非推奨だが、レガシーサイト対策として引き続き登録する。
function walkerKeyUpHandler(event: KeyboardEvent): void {
    // P1: 亡霊チェック
    if (isOrphan()) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【絶対的パススルー層】— keydown と完全に同一の条件セット
    // これらを通過するイベントにはいかなるブロックも行わない。
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Walker OFF なら一切介入しない
    if (!isWalkerMode) return;

    // 修飾キー（Ctrl / Meta / Alt）が押されている場合はブラウザに委ねる
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // テキストが選択されている場合は干渉しない
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;

    // IME 変換中はスキップ
    if (event.isComposing) return;

    // 入力欄にフォーカスがある場合は干渉しない（composedPath 版）
    if (isInputActive(event)) return;

    // 修飾キー単独はスキップ
    if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;
    if (event.repeat) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【Opt-in Block 層】— Walker キーと確定した瞬間にのみブロック
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const key = normalizeKey(event);

    if (WALKER_KEYS.has(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        // dispatchWalkerAction は呼ばない（keydown で実行済み）
    }
}

// keyup / keypress ともにキャプチャフェーズの最上流（window）に配備する
window.addEventListener('keyup', walkerKeyUpHandler, { capture: true });
window.addEventListener('keypress', walkerKeyUpHandler, { capture: true });