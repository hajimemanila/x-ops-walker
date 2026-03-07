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

export function initXWalker(config: XWalkerConfig) {
    isDashboardEnabled = config.enabled && config.rightColumnDashboard;
    console.log('[X-Ops Walker] 🐺 X Timeline Walker Protocol Status:', isDashboardEnabled);

    if (isDashboardEnabled) {
        installDashboard();
    } else {
        removeDashboard();
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if ('xWalker' in changes) {
            const newConfig = changes.xWalker.newValue as XWalkerConfig;
            isDashboardEnabled = newConfig.enabled && newConfig.rightColumnDashboard;
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

function installDashboard() {
    // 0. 重複起動を防ぐための完全クリーンアップ
    removeDashboard();

    // 1. Heartbeat (setInterval): 500msごとにDOMの生存を確認し、必要なら蘇生させる
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);

    // 2. Smooth Sync (requestAnimationFrame): 描画フレーム同期
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

// ── 🛡️ Heartbeat: Reactの破壊から逃げ切り、安定した親を探す ──
function maintainDOM() {
    if (!isDashboardEnabled) return;

    // 1. 除外URL/モーダルフィルター (TM版ロジック準拠)
    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith('/settings') || path.includes('/i/flow/login') || path === '/login' || path === '/logout' || path.startsWith('/i/display');

    if (isLoginModal || isExcluded) {
        const box = document.getElementById('x-ops-dashboard-box');
        if (box) box.style.display = 'none';
        return;
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    // サイドバーが見つからない場合は、このサイクルは終了（Heartbeatが次のチャンスを待つ）
    if (!sidebar) return;

    // Spacerの確保
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
    }

    // 2. Smart Pillar: 兄弟要素の出現でコンテナ境界を検知（自身を除外）
    const searchBar = sidebar.querySelector('[role="search"]');

    if (spacer && searchBar) {
        let target = searchBar as Element;
        let depth = 0;

        // 検索窓から上に辿り、兄弟要素（トレンドやおすすめユーザー等）を持つ大枠コンテナを見つける
        // サイドバーの内側コンテナ(sidebarWrapper)を超えないようにガード
        const sidebarWrapper = sidebar.firstElementChild || sidebar;

        while (target.parentElement && target.parentElement !== sidebarWrapper && depth < 10) {
            // 自分自身(spacer)を除外して兄弟要素を数える（無限ループと自作自演防止の要）
            const siblings = Array.from(target.parentElement.children).filter(el => el.id !== 'x-ops-dashboard-spacer');

            if (siblings.length > 1) {
                break; // ここが「検索ブロック」と「他のブロック」の境界線
            }
            target = target.parentElement as Element;
            depth++;
        }

        // 見つけた検索ブロックの直後(after)に「見えない柱」を立て、後続コンテンツを押し下げる
        if (target && target.parentElement && target.nextSibling !== spacer) {
            target.after(spacer);
            console.log('[X-Ops Walker] Dashboard spacer secured via Smart Pillar (depth:', depth, ')');
        }
    } else if (spacer && !spacer.isConnected) {
        // 検索窓がない場合のフォールバック（一番上）
        const wrapper = sidebar.firstElementChild || sidebar;
        if (wrapper.firstChild !== spacer) {
            wrapper.insertBefore(spacer, wrapper.firstChild);
        }
    }

    // Box(UI)の維持
    let box = document.getElementById('x-ops-dashboard-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'x-ops-dashboard-box';

        // Glassmorphism デザイン
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
            display: 'none', // 初期は隠し、sync() で位置確定後に表示する
            opacity: '1' // opacity 0 で残らないようにリセット
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
                <span style="font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase;">${titleText}</span>
                <button id="x-ops-quick-add" style="background: rgba(255, 140, 0, 0.15); border: 1px solid rgba(255, 140, 0, 0.3); border-radius: 4px; color: #ffac30; font-size: 9px; font-weight: 800; padding: 2px 6px; cursor: pointer; transition: all 0.2s; font-family: 'Segoe UI', sans-serif;">[+] ADD</button>
            </div>
            <div id="x-ops-bookmark-container" style="max-height: 400px; overflow-y: auto; border-bottom: 1px solid rgba(255, 140, 0, 0.1);">
                <!-- Bookmarks injected here -->
            </div>
            <div style="padding: 12px; text-align: center;">
                <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
            </div>
        `;
        document.body.appendChild(box);
        renderBookmarkList();

        // --- Quick Add Logic ---
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
                const title = document.title.replace(/\s*\/ X$/i, '').trim(); // Remove "/ X" suffix

                // cleanUrl implementation (compatible with options.ts)
                const clean = (u: string) => {
                    let c = u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
                    return c.toLowerCase().trim();
                };

                const cleanedUrl = clean(url);

                const result = await chrome.storage.local.get(['xOpsBookmarks']);
                const bookmarks = (result.xOpsBookmarks || []) as { title: string, url: string }[];

                // Duplicate check
                if (!bookmarks.some(b => clean(b.url) === cleanedUrl)) {
                    bookmarks.push({ title: title || url, url: cleanedUrl });
                    await chrome.storage.local.set({ xOpsBookmarks: bookmarks });
                }

                // Feedback
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

// ── 📐 Smooth Sync: requestAnimationFrame による滑らかな座標追従 ──
function startSync() {
    function sync() {
        if (!isDashboardEnabled) return;

        // 除外URL/モーダルフィルター (syncループ内でもチェックし、表示を即座に消す)
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

        // プロトタイプの堅牢性への回帰: spacer が接続されていれば「確実に表示」する
        if (spacer && box && sidebar && spacer.isConnected) {
            if (box.style.display !== 'block') box.style.display = 'block';

            const spacerRect = spacer.getBoundingClientRect();
            const boxHeight = box.offsetHeight;

            // 柱の高さを維持
            const newSpacerHeight = (boxHeight + 10) + 'px';
            if (spacer.style.height !== newSpacerHeight) spacer.style.height = newSpacerHeight;

            // 幅が取得できている場合のみ横位置を更新
            if (spacerRect.width > 0) {
                const newWidth = spacerRect.width + 'px';
                if (box.style.width !== newWidth) box.style.width = newWidth;

                const newLeft = spacerRect.left + 'px';
                if (box.style.left !== newLeft) box.style.left = newLeft;
            } else if (!box.style.left) {
                // 初回起動時などで幅が0の場合の「左上飛翔バグ」防止用フェイルセーフ
                const sidebarRect = sidebar.getBoundingClientRect();
                box.style.left = sidebarRect.left + 'px';
                box.style.width = sidebarRect.width + 'px';
            }

            // 究極の解決策: UIの縦位置は検索窓の物理座標(bottom)にロックする
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
            // spacerが存在しない、またはDOMツリーから切断された場合のみ隠す
            if (box.style.display !== 'none') box.style.display = 'none';
        }

        syncFrame = requestAnimationFrame(sync);
    }
    syncFrame = requestAnimationFrame(sync);
}

// ── 🔖 Bookmark Rendering & Smart Star ──
async function renderBookmarkList() {
    const container = document.getElementById('x-ops-bookmark-container');
    if (!container) return;

    const result = await chrome.storage.local.get(['xOpsBookmarks']);
    const bookmarks = (result.xOpsBookmarks || []) as Bookmark[];

    container.innerHTML = '';

    // Automatic Profile Entry
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

    item.onclick = (e) => {
        if (e.target === star) return;
        window.location.href = url.startsWith('x.com') ? 'https://' + url : url;
    };

    const link = document.createElement('a');
    link.className = 'x-ops-bm-link';
    link.textContent = title;
    link.href = url;
    link.onclick = (e) => e.preventDefault();

    const highlights = getHighlights();
    if (highlights[url]) {
        item.classList.add('active');
    }

    star.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newState = item.classList.toggle('active');
        saveHighlight(url, newState);

        star.classList.remove('popping');
        void star.offsetWidth; // trigger reflow
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

// ── ⌨️ Dashboard Hotkey Listeners ──
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

window.addEventListener('x-ops-next-star', async () => {
    const result = await chrome.storage.local.get(['xOpsBookmarks']);
    const bookmarks = (result.xOpsBookmarks || []) as Bookmark[];
    if (bookmarks.length === 0) return;

    const profileUrl = getMyProfileUrl();
    const allUrls = [profileUrl, ...bookmarks.map(b => b.url)];
    const highlights = getHighlights();
    const currentClean = cleanUrl(window.location.href);

    let currentIdx = allUrls.findIndex(u => cleanUrl(u) === currentClean);
    let nextUrl: string | null = null;

    // Logic: Look for next starred item, or next sequential if none
    const starredUrls = allUrls.filter(u => highlights[u]);

    if (starredUrls.length > 0) {
        const nextStarred = starredUrls.find(u => allUrls.indexOf(u) > currentIdx) || starredUrls[0];
        nextUrl = nextStarred;
    } else {
        const nextIdx = (currentIdx + 1) % allUrls.length;
        nextUrl = allUrls[nextIdx];
    }

    if (nextUrl && cleanUrl(nextUrl) !== currentClean) {
        window.location.href = nextUrl.startsWith('x.com') ? 'https://' + nextUrl : nextUrl;
    }
});

window.addEventListener('x-ops-go-profile', () => {
    window.location.href = getMyProfileUrl();
});
