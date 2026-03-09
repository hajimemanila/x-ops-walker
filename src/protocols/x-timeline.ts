/**
 * X Timeline Walker Protocol (v2.1.3)
 * Hybrid Architecture: setInterval (Heartbeat) + requestAnimationFrame (Smooth Sync)
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
let syncFrame: number | null = null;

// ── 🐺 Walker States & Config ──
const CONFIG = {
    skipReposts: true,
    skipAds: true,
    scrollOffset: -150,
    colors: { recent: '#00ba7c', old: '#ffd400', ancient: '#f4212e', copied: 'rgba(0, 255, 255, 0.2)' },
    zenOpacity: 0.5,
    longPressDelay: 400
};

let isActive = false;
let currentIndex = -1;
let targetArticles: HTMLElement[] = [];
let backspaceTimer: number | null = null;
let isBackspaceHeld = false;
let originalTitle = "";
let isCheatSheetVisible = false;

// 安全なCSS注入（クラッシュ防止）
function injectWalkerCSS() {
    if (document.getElementById('x-walker-style')) return;
    const style = document.createElement('style');
    style.id = 'x-walker-style';
    style.textContent = `
        body.x-walker-active article[data-testid="tweet"] { opacity: ${CONFIG.zenOpacity}; transition: opacity 0.2s ease, box-shadow 0.2s ease; }
        body.x-walker-active article[data-testid="tweet"].x-walker-focused { opacity: 1 !important; background-color: rgba(255, 255, 255, 0.03); }
    `;
    if (document.head) document.head.appendChild(style);
    else document.addEventListener('DOMContentLoaded', () => document.head && document.head.appendChild(style));
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

// ── Dashboard Logic ──
function installDashboard() {
    removeDashboard();
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);
    startSync();
}

function removeDashboard() {
    if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeatId = null;
    }
    if (syncFrame) {
        cancelAnimationFrame(syncFrame);
        syncFrame = null;
    }
    const spacer = document.getElementById('x-ops-dashboard-spacer');
    if (spacer) spacer.remove();

    const box = document.getElementById('x-ops-dashboard-box');
    if (box) box.remove();
}

function maintainDOM() {
    if (!isDashboardEnabled) return;

    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith('/settings') || path.includes('/i/flow/login') || path === '/login' || path === '/logout' || path.startsWith('/i/display');

    if (isLoginModal || isExcluded) {
        const box = document.getElementById('x-ops-dashboard-box');
        if (box) box.style.display = 'none';
        return;
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;

    let spacer = document.getElementById('x-ops-dashboard-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'x-ops-dashboard-spacer';
        spacer.style.width = '100%';
        spacer.style.height = '150px';
        spacer.style.marginTop = '12px';
        spacer.style.marginBottom = '12px';
        spacer.style.opacity = '0';
        spacer.style.pointerEvents = 'none';
        spacer.style.transition = 'height 0.2s ease'; // スペーサーの高さ変化を滑らかに
    }

    const searchBar = sidebar.querySelector('[role="search"]');

    if (spacer && searchBar) {
        let target = searchBar as Element;
        let depth = 0;
        const sidebarWrapper = sidebar.firstElementChild || sidebar;

        while (target.parentElement && target.parentElement !== sidebarWrapper && depth < 10) {
            const siblings = Array.from(target.parentElement.children).filter(el => el.id !== 'x-ops-dashboard-spacer');
            if (siblings.length > 1) {
                break;
            }
            target = target.parentElement as Element;
            depth++;
        }

        if (target && target.parentElement && target.nextSibling !== spacer) {
            target.after(spacer);
            console.log('[X-Ops Walker] Dashboard spacer secured via Smart Pillar (depth:', depth, ')');
        }
    } else if (spacer && !spacer.isConnected) {
        const wrapper = sidebar.firstElementChild || sidebar;
        if (wrapper.firstChild !== spacer) {
            wrapper.insertBefore(spacer, wrapper.firstChild);
        }
    }

    let box = document.getElementById('x-ops-dashboard-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'x-ops-dashboard-box';

        Object.assign(box.style, {
            position: 'fixed',
            zIndex: '9999',
            background: 'rgba(10, 10, 22, 0.75)',
            backdropFilter: 'blur(16px) saturate(180%)',
            webkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 140, 0, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            display: 'none',
            opacity: '1'
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
                <span style="font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase; user-select: none;">${titleText}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button id="x-ops-quick-add" style="background: rgba(255, 140, 0, 0.15); border: 1px solid rgba(255, 140, 0, 0.3); border-radius: 4px; color: #ffac30; font-size: 9px; font-weight: 800; padding: 2px 6px; cursor: pointer; transition: all 0.2s; font-family: 'Segoe UI', sans-serif;">[+] ADD</button>
                    <button id="x-ops-dashboard-toggle" title="最小化" style="background: transparent; border: none; color: rgba(255, 255, 255, 0.6); font-size: 16px; font-weight: bold; cursor: pointer; padding: 0 4px; transition: color 0.2s; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">−</button>
                </div>
            </div>
            <div id="x-ops-dashboard-content">
                <div id="x-ops-bookmark-container" style="max-height: 600px; overflow-y: auto; border-bottom: 1px solid rgba(255, 140, 0, 0.1);">
                </div>
                <div style="padding: 12px; text-align: center;">
                    <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
                </div>
            </div>
        `;
        document.body.appendChild(box);
        renderBookmarkList();

        // ── 追加：トグルボタンの開閉ロジック ──
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

        const quickAddBtn = box.querySelector('#x-ops-quick-add') as HTMLButtonElement;
        if (quickAddBtn) {
            quickAddBtn.addEventListener('mouseover', () => {
                quickAddBtn.style.background = 'rgba(255, 140, 0, 0.3)';
                quickAddBtn.style.boxShadow = '0 0 8px rgba(255, 140, 0, 0.4)';
            });
            quickAddBtn.addEventListener('mouseout', () => {
                quickAddBtn.style.background = 'rgba(255, 140, 0, 0.15)';
                quickAddBtn.style.boxShadow = 'none';
            });

            quickAddBtn.addEventListener('click', async () => {
                const url = window.location.href;
                const title = document.title.replace(/\s*\/ X$/i, '').trim();

                const clean = (u: string) => {
                    let c = u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
                    return c.toLowerCase().trim();
                };

                const cleanedUrl = clean(url);

                const result = await chrome.storage.local.get(['xOpsBookmarks']);
                const bookmarks = (result.xOpsBookmarks || []) as { title: string, url: string }[];

                if (!bookmarks.some(b => clean(b.url) === cleanedUrl)) {
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
    }
    updateTargetHighlight();
}

function startSync() {
    function sync() {
        if (!isDashboardEnabled) return;

        const path = window.location.pathname;
        const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
        const isExcluded = path.startsWith('/settings') || path.includes('/i/flow/login') || path === '/login' || path === '/logout' || path.startsWith('/i/display');

        const box = document.getElementById('x-ops-dashboard-box');
        if (isLoginModal || isExcluded) {
            if (box && box.style.display !== 'none') box.style.display = 'none';
            syncFrame = requestAnimationFrame(sync);
            return;
        }

        const spacer = document.getElementById('x-ops-dashboard-spacer');
        const sidebar = document.querySelector('[data-testid="sidebarColumn"]');

        if (spacer && box && sidebar && spacer.isConnected) {
            if (box.style.display !== 'block') box.style.display = 'block';

            const spacerRect = spacer.getBoundingClientRect();
            const boxHeight = box.offsetHeight;

            const newSpacerHeight = (boxHeight + 10) + 'px';
            if (spacer.style.height !== newSpacerHeight) spacer.style.height = newSpacerHeight;

            if (spacerRect.width > 0) {
                const newWidth = spacerRect.width + 'px';
                if (box.style.width !== newWidth) box.style.width = newWidth;

                const newLeft = spacerRect.left + 'px';
                if (box.style.left !== newLeft) box.style.left = newLeft;
            } else if (!box.style.left) {
                const sidebarRect = sidebar.getBoundingClientRect();
                box.style.left = sidebarRect.left + 'px';
                box.style.width = sidebarRect.width + 'px';
            }

            let newTop = '';
            const searchBar = sidebar.querySelector('[role="search"]');
            if (searchBar) {
                const searchRect = searchBar.getBoundingClientRect();
                newTop = (searchRect.bottom + 12) + 'px';
            } else {
                newTop = Math.max(spacerRect.top, 53) + 'px';
            }

            if (box.style.top !== newTop) box.style.top = newTop;

        } else if (box) {
            if (box.style.display !== 'none') box.style.display = 'none';
        }

        syncFrame = requestAnimationFrame(sync);
    }
    syncFrame = requestAnimationFrame(sync);
}

async function renderBookmarkList() {
    const container = document.getElementById('x-ops-bookmark-container');
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
    const container = document.getElementById('x-ops-bookmark-container');
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
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

    // Cheat sheet closure highest priority
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

    // Dashboard / Smart Star keys (M, N, Y)
    if (isDashboardEnabled && ['KeyN', 'KeyM', 'KeyY'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'KeyN') window.dispatchEvent(new CustomEvent('x-ops-toggle-star'));
        if (e.code === 'KeyM') window.dispatchEvent(new CustomEvent('x-ops-next-star'));
        if (e.code === 'KeyY') window.dispatchEvent(new CustomEvent('x-ops-go-profile'));
        return;
    }

    // Walker keys (J, K, L, O, Backspace)
    if (isActive && ['KeyJ', 'KeyK', 'KeyL', 'KeyO', 'Backspace'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.code === 'KeyK') { resyncCurrentIndex(); focusArticle(currentIndex - 1); }
        if (e.code === 'KeyJ') { resyncCurrentIndex(); focusArticle(currentIndex + 1); }
        if (e.code === 'KeyL') { executeAction('like'); }
        if (e.code === 'KeyO') { executeAction('repost'); }
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
    const currentUrl = window.location.href;
    const currentClean = cleanUrl(currentUrl);
    const box = document.getElementById('x-ops-dashboard-box');
    if (!box) return;

    const items = Array.from(box.querySelectorAll('.x-ops-bm-item')) as HTMLElement[];
    const targetItem = items.find(item => cleanUrl(item.querySelector('.x-ops-bm-link')?.getAttribute('href') || '') === currentClean);

    if (targetItem) {
        const star = targetItem.querySelector('.x-ops-bm-star') as HTMLElement;
        star?.click();
    }
});

window.addEventListener('x-ops-next-star', () => {
    const box = document.getElementById('x-ops-dashboard-box');
    if (!box) return;

    const links = Array.from(box.querySelectorAll('.x-ops-bm-link')) as HTMLAnchorElement[];
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
    currentIndex = -1;
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

        // ── 変更点：ツイートの非同期読み込みを待ってから初期フォーカスを当てる ──
        let attempts = 0;
        const initFocusInterval = setInterval(() => {
            updateTargets();
            if (targetArticles.length > 0) {
                clearInterval(initFocusInterval);

                if (window.scrollY < 200) {
                    // 最上部にいる場合は最初のポスト（index: 0）に自動フォーカス
                    focusArticle(0);
                } else {
                    // 途中までスクロールしてONにした場合は、一番近いポストにフォーカス
                    findClosestIndex();
                    if (currentIndex !== -1) focusArticle(currentIndex);
                }
            } else if (++attempts > 40) {
                // 2秒（50ms × 40回）待機してツイートが見つからなければタイムアウト
                clearInterval(initFocusInterval);
            }
        }, 50);
        // ────────────────────────────────────────────────────────

    } else {
        document.body.classList.remove('x-walker-active');
        forceClearFocus();
        currentIndex = -1;
        targetArticles = [];
    }
}

function forceClearFocus() {
    document.querySelectorAll('.x-walker-focused').forEach(el => {
        el.classList.remove('x-walker-focused');
        (el as HTMLElement).style.boxShadow = '';
    });
}

function findClosestIndex() {
    if (targetArticles.length === 0) return;
    let minDiff = Infinity; let bestIdx = 0;
    const center = window.scrollY + (window.innerHeight * 0.20);
    targetArticles.forEach((article, i) => {
        if (!article.isConnected) return;
        const rect = article.getBoundingClientRect();
        const diff = Math.abs(center - (window.scrollY + rect.top + rect.height / 2));
        if (diff < minDiff) { minDiff = diff; bestIdx = i; }
    });
    currentIndex = bestIdx;
}

function updateTargets() {
    if (document.hidden) { targetArticles = []; return; }
    targetArticles = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).filter(article => {
        if (!article.isConnected) return false;
        const text = (article as HTMLElement).innerText;

        // ── 広告スキップロジックの改良 ──
        if (CONFIG.skipAds) {
            // 自身のツイートにある「プロモーションする (Promote)」ボタンの要素を探す
            const isOwnPromotable = article.querySelector('a[href*="/quick_promote_web/"]');

            // 従来の広告テキスト判定（'プロモーションする' の文字列もここに引っかかってしまう）
            const hasAdText = text.includes('プロモーション') || text.includes('Promoted');

            // クイックプロモートボタンが存在しない、かつ広告テキストがある場合のみスキップ（falseを返す）
            if (hasAdText && !isOwnPromotable) {
                return false;
            }
        }

        if (CONFIG.skipReposts && article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/リポスト|Reposted/)) return false;
        return true;
    }) as HTMLElement[];
}

function resyncCurrentIndex() {
    const focused = document.querySelector('.x-walker-focused');
    if (focused?.isConnected) {
        updateTargets();
        const newIdx = targetArticles.indexOf(focused as HTMLElement);
        if (newIdx !== -1) { if (currentIndex !== newIdx) currentIndex = newIdx; } else findClosestIndex();
    } else if (isActive && currentIndex !== -1) findClosestIndex();
}

function focusArticle(index: number) {
    if (!isActive || document.hidden) return;
    updateTargets();

    if (index < 0) {
        window.scrollBy(0, -window.innerHeight * 1.5);
        setTimeout(() => { updateTargets(); findClosestIndex(); }, 300);
        return;
    }

    if (targetArticles.length === 0 || index >= targetArticles.length) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        setTimeout(() => {
            updateTargets();
            if (index < targetArticles.length) focusArticle(index);
        }, 1500);
        return;
    }

    forceClearFocus();
    const target = targetArticles[index];
    if (target?.isConnected) {
        target.classList.add('x-walker-focused');
        const color = (function (a) {
            const t = a.querySelector('time'); if (!t) return CONFIG.colors.recent;
            const d = (new Date().getTime() - new Date(t.getAttribute('datetime') || '').getTime()) / (86400000);
            return d >= 30 ? CONFIG.colors.ancient : d >= 4 ? CONFIG.colors.old : CONFIG.colors.recent;
        })(target);
        target.style.boxShadow = `-4px 0 0 0 ${color}, 0 0 20px ${color}33`;
        const rect = target.getBoundingClientRect();
        window.scrollTo({ top: window.pageYOffset + rect.top - (window.innerHeight / 2) + (rect.height / 2) - CONFIG.scrollOffset, behavior: 'smooth' });
        currentIndex = index;
    } else findClosestIndex();
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

function executeAction(actionType: string) {
    if (!isActive) return;
    resyncCurrentIndex();
    const article = targetArticles[currentIndex];
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
    }
}

function startDRSDelete() {
    isBackspaceHeld = true;
    resyncCurrentIndex();
    const article = targetArticles[currentIndex];
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
                        updateTargets();
                        if (currentIndex >= targetArticles.length) currentIndex = Math.max(0, targetArticles.length - 1);
                        focusArticle(currentIndex);
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
        borderRadius: '12px', padding: '24px', color: '#e7e9ea', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: '340px',
        fontFamily: '"Segoe UI", system-ui, sans-serif'
    });

    const getMsg = (key: string, fallback: string) => chrome.i18n.getMessage(key) || fallback;
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
        <div style="display: grid; grid-template-columns: 90px 1fr; gap: 10px; font-size: 13px; margin-bottom: 16px;">
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">J</kbd> / <kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">K</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_nav', 'Navigate Timeline')}</div>
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">N</kbd> / <kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">M</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_patrol', 'Star Patrol')}</div>
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">Y</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_profile', 'Go Profile')}</div>
        </div>
        <div style="font-size: 11px; color: #f4212e; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg('x_cheat_sheet_sec_action', 'COMBAT ACTIONS')}</div>
        <div style="display: grid; grid-template-columns: 90px 1fr; gap: 10px; font-size: 13px;">
            <div style="text-align: right;"><kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">L</kbd> / <kbd style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;">O</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg('x_cheat_sheet_action', 'Like / Repost')}</div>
            <div style="text-align: right;"><kbd style="background: rgba(244,33,46,0.2); border: 1px solid rgba(244,33,46,0.4); border-radius: 4px; padding: 2px 6px; color: #f4212e; font-family: monospace; font-weight: bold;">BS Hold</kbd></div>
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