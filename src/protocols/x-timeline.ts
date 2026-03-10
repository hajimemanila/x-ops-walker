/**
 * X Timeline Walker Protocol (v2.2.0 - Phantom HUD Edition)
 * Hybrid Architecture: setInterval (Heartbeat) + requestAnimationFrame (Smooth Sync)
 * [JIT Spatial Navigation Port]
 */

export interface XWalkerConfig {
    enabled: boolean;
    rightColumnDashboard: boolean;
}

interface Bookmark {
    title: string;
    url: string;
}

const STORAGE_KEY_HIGHLIGHTS = 'x_bookmark_highlights';
function getHighlights() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HIGHLIGHTS) || '{}'); }
    catch (e) { return {}; }
}
function saveHighlight(url: string, active: boolean) {
    const data = getHighlights();
    if (active) data[url] = true; else delete data[url];
    localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(data));
}
function cleanUrl(url: string) {
    if (!url) return "";
    try {
        let cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        return cleaned.toLowerCase().trim();
    } catch { return url.toLowerCase().trim(); }
}

let isDashboardEnabled = false;
let heartbeatId: ReturnType<typeof setInterval> | null = null;
let walkerSyncFrame: number | null = null;
let currentUrlPath = window.location.pathname;


// ── 🐺 Walker States & Config ──
const CONFIG = {
    skipReposts: true,
    skipAds: true,
    scrollOffset: -150,
    colors: { recent: '#00ba7c', old: '#ffd400', ancient: '#f4212e', copied: 'rgba(0, 255, 255, 0.2)' },
    zenOpacity: 0.5,
    longPressDelay: 400
};

// 【追加】JITナビゲーションモジュールのインポート
import { getCurrentTarget, focusNextTarget } from './utils/spatial-navigation';
const TARGET_SELECTOR = 'article:not([data-x-walker-ignore])';

let isActive = false;
let backspaceTimer: number | null = null;
let isBackspaceHeld = false;
let originalTitle = "";
let isCheatSheetVisible = false;
let navLockTimer: number | null = null; // 【追加】スクロール中の再計算ロック用

// ── Dashboard Caches (HUD Architecture) ──
let dashboardHost: HTMLElement | null = null;
let dashboardShadow: ShadowRoot | null = null;

// ── CSSの修正 ──
function injectWalkerCSS() {
    if (document.getElementById('x-walker-style')) return;
    const style = document.createElement('style');
    style.id = 'x-walker-style';
    style.textContent = `
        /* 変更: opacityに !important を付与し、ブックマークページでも確実に暗転（Zen）させる */
        body.x-walker-active article { opacity: ${CONFIG.zenOpacity} !important; transition: opacity 0.2s ease; }
        body.x-walker-active article:hover { background-color: transparent !important; }
        body.x-walker-active article.x-walker-focused { opacity: 1 !important; background-color: rgba(255, 255, 255, 0.03) !important; }
    `;
    document.documentElement.appendChild(style);
}

export function initXWalker(config: XWalkerConfig) {
    isDashboardEnabled = config.enabled && config.rightColumnDashboard;
    console.log('[X-Ops Walker] 🐺 X Timeline Walker Protocol Status:', isDashboardEnabled);

    setWalkerState(config.enabled);

    if (isDashboardEnabled) {
        installDashboard();
    } else {
        removeDashboard();
    }
}

chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local') {
        if ('xWalker' in changes) {
            const newConfig = changes.xWalker.newValue as XWalkerConfig;
            isDashboardEnabled = newConfig.enabled && newConfig.rightColumnDashboard;

            setWalkerState(newConfig.enabled);

            if (isDashboardEnabled) {
                installDashboard();
            } else {
                removeDashboard();
            }
        }
        if ('xOpsBookmarks' in changes && isDashboardEnabled) {
            renderBookmarkList();
        }
    }
});

// ── Dashboard Logic (Shadow DOM & Margin Spacer) ──
function installDashboard() {
    removeDashboard();
    initDashboardDOM();
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);
}

function removeDashboard() {
    if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeatId = null;
    }
    // 旧バージョンのスペーサーが残っていたら安全に削除
    const oldSpacer = document.getElementById('x-ops-dashboard-spacer');
    if (oldSpacer) oldSpacer.remove();

    if (dashboardHost) {
        dashboardHost.remove();
        dashboardHost = null;
        dashboardShadow = null;
    }
}

function maintainDOM() {
    if (!isDashboardEnabled) return;

    // Reactの破壊から身を守る自動修復
    if (!dashboardHost) {
        initDashboardDOM();
    } else if (!dashboardHost.isConnected) {
        document.body.appendChild(dashboardHost);
    }
}

function initDashboardDOM() {
    if (dashboardHost) return;

    // Reactの管轄外（body直下）に配置するHost要素
    dashboardHost = document.createElement('div');
    dashboardHost.id = 'x-ops-dashboard-host';
    Object.assign(dashboardHost.style, {
        position: 'fixed',
        zIndex: '9999',
        pointerEvents: 'none', // 背景のクリックを阻害しない
        display: 'none'
    });

    dashboardShadow = dashboardHost.attachShadow({ mode: 'closed' });

    const box = document.createElement('div');
    box.id = 'box';
    Object.assign(box.style, {
        background: 'rgba(10, 10, 22, 0.75)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255, 140, 0, 0.2)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        pointerEvents: 'auto', // パネル内はクリック可能
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        color: '#eff3f4',
        transition: 'height 0.2s ease',
        width: '100%'
    });

    const titleText = chrome.i18n.getMessage('x_dashboard_title') || 'PHANTOM OPS DASHBOARD';
    const statusText = chrome.i18n.getMessage('x_dashboard_status_ready') || 'SYSTEM READY';

    box.innerHTML = `
        <style>
            #x-ops-bookmark-container::-webkit-scrollbar { width: 4px; }
            #x-ops-bookmark-container::-webkit-scrollbar-thumb { background: rgba(255, 140, 0, 0.3); border-radius: 10px; }
            .x-ops-bm-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; transition: background-color 0.2s; border-bottom: 1px solid rgba(255, 140, 0, 0.05); position: relative; }
            .x-ops-bm-item:hover { background-color: rgba(255, 255, 255, 0.03); }
            .x-ops-bm-item.target-lock { border-left: 3px solid #00ba7c; background: rgba(0, 186, 124, 0.05); }
            .x-ops-bm-item.active { background: rgba(255, 172, 48, 0.05); }
            .x-ops-bm-link { flex-grow: 1; font-size: 13px; font-weight: 500; color: #eff3f4; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .x-ops-bm-star { font-size: 16px; color: #71767b; padding: 4px; border-radius: 50%; margin-left: 8px; transition: color 0.2s; cursor: pointer; }
            .x-ops-bm-item.active .x-ops-bm-star { color: #ffac30; }
            .x-ops-bm-star:hover { color: #ffac30; background: rgba(255, 172, 48, 0.1); }
            .x-ops-bm-star.popping { animation: starPop 0.3s ease-out; }
            @keyframes starPop { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
        </style>
        <div style="padding: 10px 14px; background: rgba(255, 140, 0, 0.1); border-bottom: 1px solid rgba(255, 140, 0, 0.2); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase; user-select: none;">${titleText}</span>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button id="x-ops-quick-add" style="background: rgba(255, 140, 0, 0.15); border: 1px solid rgba(255, 140, 0, 0.3); border-radius: 4px; color: #ffac30; font-size: 9px; font-weight: 800; padding: 2px 6px; cursor: pointer; transition: all 0.2s;">[+] ADD</button>
                <button id="x-ops-dashboard-toggle" title="最小化" style="background: transparent; border: none; color: rgba(255, 255, 255, 0.6); font-size: 16px; font-weight: bold; cursor: pointer; padding: 0 4px; transition: color 0.2s; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">−</button>
            </div>
        </div>
        <div id="x-ops-dashboard-content">
            <div id="x-ops-bookmark-container" style="max-height: 600px; overflow-y: auto; border-bottom: 1px solid rgba(255, 140, 0, 0.1);"></div>
            <div style="padding: 12px; text-align: center;">
                <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
            </div>
        </div>
    `;

    // トグル機能
    const toggleBtn = box.querySelector('#x-ops-dashboard-toggle') as HTMLButtonElement;
    const contentContainer = box.querySelector('#x-ops-dashboard-content') as HTMLDivElement;
    if (toggleBtn && contentContainer) {
        toggleBtn.addEventListener('mouseover', () => toggleBtn.style.color = '#fff');
        toggleBtn.addEventListener('mouseout', () => toggleBtn.style.color = 'rgba(255, 255, 255, 0.6)');
        toggleBtn.addEventListener('click', () => {
            const isHidden = contentContainer.style.display === 'none';
            if (isHidden) {
                contentContainer.style.display = 'block';
                toggleBtn.textContent = '−';
                toggleBtn.title = '最小化';
            } else {
                contentContainer.style.display = 'none';
                toggleBtn.textContent = '＋';
                toggleBtn.title = '展開';
            }
        });
    }

    // クイック追加機能
    const quickAddBtn = box.querySelector('#x-ops-quick-add') as HTMLButtonElement;
    if (quickAddBtn) {
        quickAddBtn.addEventListener('mouseover', () => { quickAddBtn.style.background = 'rgba(255, 140, 0, 0.3)'; quickAddBtn.style.boxShadow = '0 0 8px rgba(255, 140, 0, 0.4)'; });
        quickAddBtn.addEventListener('mouseout', () => { quickAddBtn.style.background = 'rgba(255, 140, 0, 0.15)'; quickAddBtn.style.boxShadow = 'none'; });
        quickAddBtn.addEventListener('click', async () => {
            const url = window.location.href;
            const title = document.title.replace(/\s*\/ X$/i, '').trim();
            const cleanedUrl = cleanUrl(url);
            const result = await chrome.storage.local.get(['xOpsBookmarks']);
            const bookmarks = (result.xOpsBookmarks || []) as { title: string, url: string }[];

            if (!bookmarks.some(b => cleanUrl(b.url) === cleanedUrl)) {
                bookmarks.push({ title: title || url, url: cleanedUrl });
                await chrome.storage.local.set({ xOpsBookmarks: bookmarks });
            }

            const originalText = quickAddBtn.innerText;
            quickAddBtn.innerText = 'ADDED!';
            quickAddBtn.style.color = '#00ba7c';
            quickAddBtn.style.borderColor = '#00ba7c';
            setTimeout(() => {
                quickAddBtn.innerText = originalText;
                quickAddBtn.style.color = '#ffac30';
                quickAddBtn.style.borderColor = 'rgba(255, 140, 0, 0.3)';
            }, 1000);
        });
    }

    dashboardShadow.appendChild(box);
    document.body.appendChild(dashboardHost);
    renderBookmarkList();
}

function syncDashboardUI() {
    if (!dashboardHost || !dashboardShadow) return;
    const box = dashboardShadow.getElementById('box');
    if (!box) return;

    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith('/settings') || path.includes('/i/flow/login') || path === '/login' || path === '/logout' || path.startsWith('/i/display');

    if (isLoginModal || isExcluded) {
        if (dashboardHost.style.display !== 'none') dashboardHost.style.display = 'none';
        return;
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) {
        if (dashboardHost.style.display !== 'none') dashboardHost.style.display = 'none';
        return;
    }

    if (dashboardHost.style.display !== 'block') dashboardHost.style.display = 'block';

    // サイドバーの座標に追従
    const sidebarRect = sidebar.getBoundingClientRect();
    if (dashboardHost.style.width !== sidebarRect.width + 'px') dashboardHost.style.width = sidebarRect.width + 'px';
    if (dashboardHost.style.left !== sidebarRect.left + 'px') dashboardHost.style.left = sidebarRect.left + 'px';

    let targetTop = 0;
    let targetMarginDiv: HTMLElement | null = null;
    const searchBar = sidebar.querySelector('[role="search"]');

    if (searchBar) {
        const searchRect = searchBar.getBoundingClientRect();
        targetTop = searchRect.bottom + 12;
        targetMarginDiv = searchBar.parentElement?.nextElementSibling as HTMLElement;
    } else {
        targetTop = Math.max(sidebarRect.top, 53);
        targetMarginDiv = sidebar.firstElementChild as HTMLElement;
    }

    if (dashboardHost.style.top !== targetTop + 'px') dashboardHost.style.top = targetTop + 'px';

    // Reactを壊さない「仮想スペーサー（Margin制御）」
    if (targetMarginDiv) {
        const currentBoxHeight = box.offsetHeight;
        const targetMargin = (currentBoxHeight + 10) + 'px';
        if (targetMarginDiv.style.marginTop !== targetMargin) {
            targetMarginDiv.style.marginTop = targetMargin;
            targetMarginDiv.style.transition = 'margin-top 0.2s ease';
        }
    }
}

// ── 🛡️ Unified Walker Loop (SPA Router & React Defense) ──

// 【追加】レーダー捕捉前にノイズ（広告/リポスト）をマーキングする関数
function tagIgnoredArticles() {
    document.querySelectorAll('article:not([data-x-walker-inspected])').forEach(article => {
        article.setAttribute('data-x-walker-inspected', 'true');
        const text = (article as HTMLElement).innerText || "";
        let shouldIgnore = false;

        if (CONFIG.skipAds) {
            const isOwnPromotable = article.querySelector('a[href*="/quick_promote_web/"]');
            const hasAdText = text.includes('プロモーション') || text.includes('Promoted');
            if (hasAdText && !isOwnPromotable) {
                shouldIgnore = true;
            }
        }
        if (!shouldIgnore && CONFIG.skipReposts) {
            if (article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/リポスト|Reposted/)) {
                shouldIgnore = true;
            }
        }
        if (shouldIgnore) {
            article.setAttribute('data-x-walker-ignore', 'true');
        }
    });
}

function startWalkerLoop() {
    if (walkerSyncFrame !== null) cancelAnimationFrame(walkerSyncFrame);

    function loop() {
        if (!isActive) {
            walkerSyncFrame = null;
            return;
        }

        // 🌟 蘇生防壁: ReactによるSPA遷移時の body クラス剥奪を監視・復元
        if (!document.body.classList.contains('x-walker-active')) {
            document.body.classList.add('x-walker-active');
        }
        // CSSタグ自体の生存確認
        injectWalkerCSS();

        // 1. SPAナビゲーション検知（通知や別ページへの遷移をフック）
        if (currentUrlPath !== window.location.pathname) {
            currentUrlPath = window.location.pathname;
            triggerAutoTargeting();
        }

        // 【追加】ノイズのマーキング
        tagIgnoredArticles();

        // 2. React 再レンダリング防壁（ホバー時のスタイル消失を即座に修復）
        maintainFocusVisuals();

        // 3. ダッシュボードの追従同期
        if (isDashboardEnabled) syncDashboardUI();

        walkerSyncFrame = requestAnimationFrame(loop);
    }
    walkerSyncFrame = requestAnimationFrame(loop);
}

// 【変更】JIT用の初期フォーカス発火ロジックに換装
function triggerAutoTargeting() {
    let attempts = 0;
    const initFocusInterval = setInterval(() => {
        const targets = Array.from(document.querySelectorAll(TARGET_SELECTOR));
        if (targets.length > 0) {
            clearInterval(initFocusInterval);
            setTimeout(() => {
                if (!isActive) return;
                const target = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
                if (target && window.scrollY < 200) {
                    const rect = target.getBoundingClientRect();
                    window.scrollTo({
                        top: window.scrollY + rect.top - (window.innerHeight * 0.3) - CONFIG.scrollOffset,
                        behavior: 'smooth'
                    });
                }
            }, 300);
        } else if (++attempts > 40) {
            clearInterval(initFocusInterval);
        }
    }, 50);
}

function getArticleColor(article: HTMLElement): string {
    const t = article.querySelector('time');
    if (!t) return CONFIG.colors.recent;
    const d = (new Date().getTime() - new Date(t.getAttribute('datetime') || '').getTime()) / (86400000);
    return d >= 30 ? CONFIG.colors.ancient : d >= 4 ? CONFIG.colors.old : CONFIG.colors.recent;
}

// 【変更】遅延ゼロのビジュアル維持ロジック（スマートロック方式）
function maintainFocusVisuals() {
    let currentTarget: HTMLElement | null = null;

    if (navLockTimer !== null) {
        // スクロール（J/K）移動中: レーダーを一時停止し、直前にロックオンされた要素を維持する
        currentTarget = document.querySelector('.x-walker-focused') as HTMLElement;
    } else {
        // 通常時: レーダーで画面中央に最も近い要素をリアルタイム捕捉する
        currentTarget = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
    }

    if (!currentTarget) return;

    // 既存のフォーカスを剥がす
    document.querySelectorAll('.x-walker-focused').forEach(el => {
        if (el !== currentTarget) {
            el.classList.remove('x-walker-focused');
            (el as HTMLElement).style.boxShadow = '';
        }
    });

    // 新たなターゲットにフォーカスを付与
    if (!currentTarget.classList.contains('x-walker-focused')) {
        currentTarget.classList.add('x-walker-focused');
    }

    // 毎フレーム即座にシャドウと色を計算して適用（もっさり感の排除）
    const color = getArticleColor(currentTarget);
    const expectedShadow = `-4px 0 0 0 ${color}, 0 0 20px ${color}33`;
    if (currentTarget.style.boxShadow !== expectedShadow) {
        currentTarget.style.boxShadow = expectedShadow;
    }
}

async function renderBookmarkList() {
    if (!dashboardShadow) return;
    const container = dashboardShadow.getElementById('x-ops-bookmark-container');
    if (!container) return;

    const result = await chrome.storage.local.get(['xOpsBookmarks']);
    const bookmarks = (result.xOpsBookmarks || []) as Bookmark[];

    container.innerHTML = '';

    const profileUrl = getMyProfileUrl();
    container.appendChild(createBookmarkItem("My Profile (自分のプロフィール)", profileUrl));

    bookmarks.forEach(bm => {
        container.appendChild(createBookmarkItem(bm.title, bm.url));
    });

    updateTargetHighlight();
}

function getMyProfileUrl(): string {
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') as HTMLAnchorElement;
    return profileLink ? profileLink.href : 'https://x.com/home';
}

function createBookmarkItem(title: string, url: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'x-ops-bm-item';
    const star = document.createElement('span');
    star.className = 'x-ops-bm-star';
    star.textContent = '☆';

    const absoluteUrl = url.startsWith('http') ? url : 'https://' + url;

    item.onclick = (e) => {
        if (e.target === star) return;
        window.location.href = absoluteUrl;
    };

    const link = document.createElement('a');
    link.className = 'x-ops-bm-link';
    link.textContent = title;
    link.href = absoluteUrl;
    link.onclick = (e) => e.preventDefault();

    const highlights = getHighlights();
    const cleanUrlStr = cleanUrl(url);
    const isActiveHighlight = highlights[cleanUrlStr];

    if (isActiveHighlight) {
        item.classList.add('active');
    }

    star.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const myProfileUrl = cleanUrl(getMyProfileUrl());
        if (cleanUrlStr === myProfileUrl) return;

        const newState = item.classList.toggle('active');
        saveHighlight(cleanUrlStr, newState);

        star.classList.remove('popping');
        void star.offsetWidth;
        star.classList.add('popping');
    };

    item.appendChild(link);
    item.appendChild(star);

    return item;
}

function updateTargetHighlight() {
    if (!dashboardShadow) return;
    const container = dashboardShadow.getElementById('x-ops-bookmark-container');
    if (!container) return;

    const currentClean = cleanUrl(window.location.href);
    const items = container.querySelectorAll('.x-ops-bm-item');
    items.forEach(item => {
        const link = item.querySelector('.x-ops-bm-link') as HTMLAnchorElement;
        if (link && cleanUrl(link.getAttribute('href') || '') === currentClean) {
            item.classList.add('target-lock');
        } else {
            item.classList.remove('target-lock');
        }
    });
}

// ── ⌨️ Global Event Listeners & Hotkeys ──
function isInputActive(): boolean {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    return ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) || (activeEl as HTMLElement).isContentEditable;
}

window.addEventListener('keydown', (e) => {
    if (isInputActive()) return;
    if (e.shiftKey && e.code !== 'Semicolon') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (isCheatSheetVisible && e.code !== 'KeyH') {
        e.preventDefault();
        toggleCheatSheet();
        return;
    }

    if (e.code === 'KeyH') {
        if (!isActive && !isDashboardEnabled) return;
        e.preventDefault();
        toggleCheatSheet();
        return;
    }

    if (isDashboardEnabled && ['KeyN', 'KeyM', 'KeyY'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'KeyN') window.dispatchEvent(new CustomEvent('x-ops-toggle-star'));
        if (e.code === 'KeyM') window.dispatchEvent(new CustomEvent('x-ops-next-star'));
        if (e.code === 'KeyY') window.dispatchEvent(new CustomEvent('x-ops-go-profile'));
        return;
    }

    if (isActive && ['KeyJ', 'KeyK', 'KeyL', 'KeyO', 'KeyB', 'Backspace', 'KeyI', 'KeyU', 'Semicolon', 'Enter', 'Slash', 'KeyC', 'Comma'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();

        // 【変更】J/K を focusNextTarget に委譲
        if (e.code === 'KeyK' || e.code === 'KeyJ') {
            const direction = e.code === 'KeyJ' ? 1 : -1;
            focusNextTarget(TARGET_SELECTOR, direction, CONFIG.scrollOffset);

            // スムーススクロール完了まで自動再計算をブロック（Race Condition防止）
            if (navLockTimer) clearTimeout(navLockTimer);
            navLockTimer = window.setTimeout(() => { navLockTimer = null; }, 400);
        }
        // 【変更】アクション系を executeAction(JIT版) へ委譲
        if (e.code === 'KeyL') { executeAction('like'); }
        if (e.code === 'KeyO') { executeAction('repost'); }
        if (e.code === 'KeyB') { executeAction('bookmark'); }

        if (e.code === 'KeyI') {
            window.location.href = 'https://x.com/notifications';
        }
        if (e.code === 'KeyU') {
            window.location.href = 'https://x.com/i/bookmarks';
        }

        if (e.code === 'Slash') {
            const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"]') as HTMLElement;
            if (searchInput) searchInput.focus();
        }

        if (e.code === 'Semicolon') {
            if (e.shiftKey) {
                const composeBtn = document.querySelector('a[href="/compose/post"], a[href="/compose/tweet"]') as HTMLElement
                    || document.querySelector('[data-testid="SideNav_NewTweet_Button"]') as HTMLElement;

                if (composeBtn) {
                    composeBtn.click();
                } else {
                    console.warn('[X-Ops Walker] Compose button not found.');
                }
            } else {
                // 【変更】JIT版ターゲット取得
                const target = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
                if (target && target.isConnected) {
                    const replyBtn = target.querySelector('[data-testid="reply"]') as HTMLElement;
                    if (replyBtn) replyBtn.click();
                }
            }
        }

        if (e.code === 'Enter') {
            // 【変更】JIT版ターゲット取得
            const target = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
            if (target && target.isConnected) {
                const timeEl = target.querySelector('time');
                const link = timeEl ? timeEl.closest('a') : null;
                if (link) {
                    link.click();
                }
            }
        }

        if (e.code === 'KeyC') {
            // 【変更】JIT版ターゲット取得
            const target = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
            if (target && target.isConnected) {
                const textNode = target.querySelector('[data-testid="tweetText"]') as HTMLElement;
                if (textNode) {
                    const textToCopy = textNode.innerText;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        flashFeedback(target, 'rgba(0, 255, 255, 0.2)');
                    }).catch(err => console.error('[X Walker] Copy failed:', err));
                }
            }
        }

        // 【追加】Homeへの遷移ロジック
        if (e.code === 'Comma') {
            window.location.href = 'https://x.com/home';
            return;
        }

        if (e.code === 'Backspace') {
            if (e.repeat) return;
            startDRSDelete();
        }
        return;
    }
}, true);

window.addEventListener('keyup', (e) => {
    if (!isActive) return;
    if (isInputActive()) return;

    if (e.code === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();

        isBackspaceHeld = false;
        if (backspaceTimer !== null) {
            clearTimeout(backspaceTimer);
            backspaceTimer = null;
        }

        if (document.title === "⚠️ DRS ACTIVE ⚠️") {
            document.title = originalTitle;
        }
    }
}, true);

window.addEventListener('x-ops-toggle-star', () => {
    if (!dashboardShadow) return;
    const currentUrl = window.location.href;
    const currentClean = cleanUrl(currentUrl);

    const items = Array.from(dashboardShadow.querySelectorAll('.x-ops-bm-item')) as HTMLElement[];
    const targetItem = items.find(item => cleanUrl(item.querySelector('.x-ops-bm-link')?.getAttribute('href') || '') === currentClean);

    if (targetItem) {
        const star = targetItem.querySelector('.x-ops-bm-star') as HTMLElement;
        star?.click();
    }
});

window.addEventListener('x-ops-next-star', () => {
    if (!dashboardShadow) return;
    const links = Array.from(dashboardShadow.querySelectorAll('.x-ops-bm-link')) as HTMLAnchorElement[];
    if (links.length === 0) return;

    const targets = links.map(a => a.href);
    const highlights = getHighlights();
    const currentPath = cleanUrl(window.location.href);
    const myProfilePath = cleanUrl(getMyProfileUrl());

    let currentIdx = targets.findIndex(url => cleanUrl(url) === currentPath);
    let nextUrl: string | null = null;

    if (currentIdx !== -1 && highlights[cleanUrl(targets[currentIdx])]) {
        let i = 1;
        while (i < targets.length) {
            let candidateIdx = (currentIdx + i) % targets.length;
            let candidateUrl = targets[candidateIdx];
            if (cleanUrl(candidateUrl) !== myProfilePath) {
                nextUrl = candidateUrl;
                break;
            }
            i++;
        }
    } else {
        let starredIdx = targets.findIndex(url => highlights[cleanUrl(url)]);
        if (starredIdx !== -1) {
            nextUrl = targets[starredIdx];
        } else {
            let i = 1;
            while (i < targets.length) {
                let candidateIdx = (Math.max(0, currentIdx) + i) % targets.length;
                let candidateUrl = targets[candidateIdx];
                if (cleanUrl(candidateUrl) !== myProfilePath) {
                    nextUrl = candidateUrl;
                    break;
                }
                i++;
            }
        }
    }

    if (nextUrl && cleanUrl(nextUrl) !== currentPath) {
        let modified = false;

        if (currentIdx !== -1) {
            const originUrl = targets[currentIdx];
            if (cleanUrl(originUrl) !== myProfilePath && highlights[cleanUrl(originUrl)]) {
                delete highlights[cleanUrl(originUrl)];
                modified = true;
            }
        }

        if (cleanUrl(nextUrl) !== myProfilePath && !highlights[cleanUrl(nextUrl)]) {
            highlights[cleanUrl(nextUrl)] = true;
            modified = true;
        }

        if (modified) {
            localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(highlights));
        }
        window.location.href = nextUrl;
    }
});

window.addEventListener('x-ops-go-profile', () => {
    window.location.href = getMyProfileUrl();
});

window.addEventListener('x-ops-global-reset', () => {
    if (!isActive) return;
    forceClearFocus();
    // currentIndex = -1; // 削除
});

// ── 🐺 Timeline Walker Core Logic ──
function setWalkerState(enabled: boolean) {
    if (isActive === enabled) return;
    isActive = enabled;

    if ((window as any).PhantomUI) {
        (window as any).PhantomUI.update(enabled);
    }

    if (isActive) {
        injectWalkerCSS();
        document.body.classList.add('x-walker-active');

        startWalkerLoop();       // SPA検知・React防壁・UI同期のループを開始
        triggerAutoTargeting();  // 初期ロードのフォーカスを実行
    } else {
        document.body.classList.remove('x-walker-active');
        forceClearFocus();
        // currentIndex = -1; // 削除
        // targetArticles = []; // 削除
    }
}

// 【変更】フォーカスクリア時のインラインスタイル初期化
function forceClearFocus() {
    document.querySelectorAll('.x-walker-focused').forEach(el => {
        el.classList.remove('x-walker-focused');
        (el as HTMLElement).style.boxShadow = ''; // クラスだけでなくスタイルもパージ
    });
}

function flashFeedback(article: HTMLElement, color: string) {
    if (!article?.isConnected) return;
    const originalBg = article.style.backgroundColor; article.style.backgroundColor = color;
    setTimeout(() => { if (article.isConnected) article.style.backgroundColor = originalBg; }, 200);
}

function waitAndClick(selector: string | (() => HTMLElement | null), callback?: (el: HTMLElement) => void) {
    let attempts = 0; const interval = setInterval(() => {
        const el = typeof selector === 'function' ? selector() : document.querySelector(selector) as HTMLElement;
        if (el) { clearInterval(interval); el.click(); callback?.(el); }
        else if (++attempts > 40) clearInterval(interval);
    }, 50);
}

// 【変更】アクション実行時のステートレス化
function executeAction(actionType: string) {
    if (!isActive) return;
    const article = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
    if (!article?.isConnected) return;

    if (actionType === 'like') {
        const btn = article.querySelector('[data-testid="like"], [data-testid="unlike"]') as HTMLElement;
        if (btn) btn.click();
        else flashFeedback(article, 'rgba(249, 24, 128, 0.1)');
    } else if (actionType === 'repost') {
        const btn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]') as HTMLElement;
        if (btn) {
            btn.click();
            waitAndClick(btn.getAttribute('data-testid') === 'retweet' ? '[data-testid="retweetConfirm"]' : '[data-testid="unretweetConfirm"]', () => flashFeedback(article, 'rgba(0, 186, 124, 0.1)'));
        }
    } else if (actionType === 'bookmark') {
        const btn = article.querySelector('[data-testid="bookmark"], [data-testid="removeBookmark"]') as HTMLElement;
        if (btn) {
            btn.click();
            flashFeedback(article, 'rgba(29, 155, 240, 0.2)');
        }
    }
}

// 【変更】DRS削除のステートレス化
function startDRSDelete() {
    isBackspaceHeld = true;
    const article = getCurrentTarget(TARGET_SELECTOR) as HTMLElement;
    if (!article) return;

    originalTitle = document.title;
    document.title = "⚠️ DRS ACTIVE ⚠️";

    const caret = article.querySelector('[data-testid="caret"]') as HTMLElement;
    if (caret) caret.click();

    setTimeout(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return;
        const deleteItems = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        const deleteItem = deleteItems.find(el => el.textContent?.match(/削除|Delete/)) as HTMLElement;
        if (deleteItem) deleteItem.click();
    }, 100);

    backspaceTimer = window.setTimeout(() => {
        if (isBackspaceHeld) {
            let attempts = 0;
            const interval = setInterval(() => {
                const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]') as HTMLElement;
                if (confirmBtn) {
                    clearInterval(interval);
                    confirmBtn.click();
                    flashFeedback(article, 'rgba(244, 33, 46, 0.3)');
                    setTimeout(() => {
                        focusNextTarget(TARGET_SELECTOR, 1, CONFIG.scrollOffset);
                    }, 500);
                } else if (++attempts > 40) {
                    clearInterval(interval);
                }
            }, 50);

            if (document.title === "⚠️ DRS ACTIVE ⚠️") document.title = originalTitle;
            isBackspaceHeld = false;
        }
    }, 600);
}

function toggleCheatSheet() {
    let sheet = document.getElementById('x-ops-cheat-sheet');
    if (sheet) { sheet.remove(); isCheatSheetVisible = false; return; }

    isCheatSheetVisible = true;
    sheet = document.createElement('div');
    sheet.id = 'x-ops-cheat-sheet';
    Object.assign(sheet.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: '10000',
        background: 'rgba(15, 15, 20, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px', padding: '24px', color: '#e7e9ea', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: '360px',
        fontFamily: '"Segoe UI", system-ui, sans-serif'
    });

    const getMsg = (key: string, fallback: string) => chrome.i18n.getMessage(key) || fallback;

    const kbdStyle = `background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;`;
    const kbdAlertStyle = `background: rgba(244,33,46,0.2); border: 1px solid rgba(244,33,46,0.4); border-radius: 4px; padding: 2px 6px; color: #f4212e; font-family: monospace; font-weight: bold;`;

    sheet.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span style="color: #ff8c00;">⚡</span> X-OPS WALKER
            </div>
            <div style="background: rgba(255, 140, 0, 0.15); color: #ffac30; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.3);">
                ${getMsg('x_cheat_sheet_badge', 'CHEAT SHEET')}
            </div>
        </div>

        <div style="font-size: 11px; color: #ff8c00; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg('x_cheat_sheet_sec_nav', 'TACTICAL NAVIGATION')}</div>
        <div style="display: grid; grid-template-columns: 105px 1fr; gap: 10px; font-size: 13px; margin-bottom: 16px;">
            <div style="text-align: right;"><kbd style="${kbdStyle}">J</kbd> / <kbd style="${kbdStyle}">K</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_nav', 'Navigate Timeline')}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">Enter</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_detail', 'Open Detail')}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">/</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_search', 'Search')}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">I</kbd> / <kbd style="${kbdStyle}">U</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_jump', 'Notifs / Bookmarks')}</div>

            <div style="text-align: right;"><kbd style="${kbdStyle}">,</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_home', 'Go Home')}</div>

            <div style="text-align: right;"><kbd style="${kbdStyle}">N</kbd> / <kbd style="${kbdStyle}">M</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_patrol', 'Star Patrol')}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">Y</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_profile', 'Go Profile')}</div>
        </div>

        <div style="font-size: 11px; color: #f4212e; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg('x_cheat_sheet_sec_action', 'COMBAT ACTIONS')}</div>
        <div style="display: grid; grid-template-columns: 105px 1fr; gap: 10px; font-size: 13px;">
            <div style="text-align: right;"><kbd style="${kbdStyle}">L</kbd> / <kbd style="${kbdStyle}">O</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_action', 'Like / Repost')}</div>

            <div style="text-align: right;"><kbd style="${kbdStyle}">B</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_bookmark', 'Bookmark')}</div>
            <div style="text-align: right;"><kbd style="${kbdStyle}">;</kbd> / <kbd style="${kbdStyle}">⇧+;</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_reply', 'Reply / Compose')}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">C</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_copy', 'Copy Text')}</div>

            <div style="text-align: right;"><kbd style="${kbdAlertStyle}">BS Hold</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_delete', 'DRS Delete')}</div>
        </div>

        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #71767b;">
            ${getMsg('x_cheat_sheet_close', 'Press H or click anywhere to close')}
        </div>
    `;
    document.body.appendChild(sheet);
    const closer = () => { sheet?.remove(); isCheatSheetVisible = false; document.removeEventListener('click', closer); };
    setTimeout(() => document.addEventListener('click', closer), 10);
}

// ── 🔄 Tab Wake-up Resync (Race Condition 防壁) ──
function onTabWakeUp() {
    if (document.hidden) return;

    // 変更: kernel.tsのblurActiveInput(150ms)の完了を待ち、競合を避けるために200msへ変更
    setTimeout(() => {
        // Chrome対策: kernelの処理後、変な要素に残ったフォーカスを確実に引き剥がしbodyを掴む
        const active = document.activeElement as HTMLElement;
        if (active && active !== document.body) {
            // 入力欄以外なら強制blur
            if (!['INPUT', 'TEXTAREA'].includes(active.tagName) && !active.isContentEditable) {
                active.blur();
            }
        }
        document.body.focus();

        if (isDashboardEnabled) {
            maintainDOM();
            syncDashboardUI();
        }

        if (isActive) {
            maintainFocusVisuals();
        }
    }, 200);
}

document.addEventListener('visibilitychange', onTabWakeUp);
window.addEventListener('focus', onTabWakeUp);