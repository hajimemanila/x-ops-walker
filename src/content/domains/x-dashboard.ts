/**
 * X.com Right Column Dashboard
 * Domain Protocol for Phantom Mode
 */

declare var chrome: any;

interface Bookmark {
    name: string;
    url: string;
}

let isDashboardEnabled = false;
let pollingInterval: number | null = null;
let currentBookmarks: Bookmark[] = [];

chrome.storage.local.get(['xOpsBookmarks'], (result: any) => {
    currentBookmarks = result.xOpsBookmarks || [];
});

chrome.storage.onChanged.addListener((changes: any, namespace: string) => {
    if (namespace === 'local' && changes.xOpsBookmarks) {
        currentBookmarks = changes.xOpsBookmarks.newValue || [];
        renderBookmarkList();
    }
});

function getMyProfileUrl(): string {
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') as HTMLAnchorElement;
    return profileLink ? profileLink.href : 'https://x.com/home';
}

function renderBookmarkList() {
    const container = document.getElementById('x-ops-bookmark-container');
    if (!container) return;

    container.innerHTML = '';

    const profileUrl = getMyProfileUrl();
    container.appendChild(createBookmarkItem('My Profile (自分のプロフィール)', profileUrl));

    currentBookmarks.forEach(bm => {
        container.appendChild(createBookmarkItem(bm.name, bm.url));
    });

    updateTargetHighlight();
}

function createBookmarkItem(name: string, url: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'x-ops-bm-item';
    item.onclick = () => {
        window.location.href = url;
    };

    const link = document.createElement('a');
    link.className = 'x-ops-bm-link';
    link.textContent = name;
    link.href = url;
    link.onclick = (e) => e.preventDefault();

    const star = document.createElement('span');
    star.className = 'x-ops-bm-star';
    star.textContent = '☆';

    item.appendChild(link);
    item.appendChild(star);

    return item;
}

function updateTargetHighlight() {
    const container = document.getElementById('x-ops-bookmark-container');
    if (!container) return;

    const currentUrl = window.location.href.replace(/\/$/, '');

    const items = container.querySelectorAll('.x-ops-bm-item');
    items.forEach(item => {
        const link = item.querySelector('.x-ops-bm-link') as HTMLAnchorElement;
        if (link) {
            const linkUrl = link.href.replace(/\/$/, '');
            if (currentUrl === linkUrl) {
                item.classList.add('target-lock');
            } else {
                item.classList.remove('target-lock');
            }
        }
    });
}

function installDashboard() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = window.setInterval(pollAndSync, 500);
}

function removeDashboard() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    const spacer = document.getElementById('x-ops-dashboard-spacer');
    if (spacer) spacer.remove();

    const box = document.getElementById('x-ops-dashboard-box');
    if (box) box.remove(); // Completely remove to keep DOM clean when OFF
}

function pollAndSync() {
    if (!isDashboardEnabled) {
        removeDashboard();
        return;
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;

    let spacer = document.getElementById('x-ops-dashboard-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'x-ops-dashboard-spacer';
        spacer.style.width = '100%';
        spacer.style.marginTop = '12px';
        spacer.style.opacity = '0';
        spacer.style.pointerEvents = 'none';
    }

    let box = document.getElementById('x-ops-dashboard-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'x-ops-dashboard-box';
        box.style.position = 'fixed';
        box.style.zIndex = '10';
        box.style.setProperty('background-color', '#000000', 'important');
        box.style.pointerEvents = 'auto';
        box.style.border = '1px solid rgb(56, 68, 77)';
        box.style.borderRadius = '16px';
        box.style.boxSizing = 'border-box';
        box.style.padding = '12px';
        box.style.color = '#fff';
        box.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';

        const title = document.createElement('h2');
        title.textContent = 'Phantom Ops Dashboard';
        title.style.fontSize = '15px';
        title.style.fontWeight = '800';
        title.style.letterSpacing = '0.05em';
        title.style.textTransform = 'uppercase';
        title.style.margin = '0 0 12px 0';
        title.style.color = '#ffac30';
        title.style.borderBottom = '1px solid rgba(255, 140, 0, 0.2)';
        title.style.paddingBottom = '8px';
        box.appendChild(title);

        const style = document.createElement('style');
        style.textContent = `
            .x-ops-bm-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; transition: background-color 0.2s; border-bottom: 1px solid rgb(56, 68, 77); }
            .x-ops-bm-item:hover { background-color: rgba(255, 255, 255, 0.03); }
            .x-ops-bm-item.target-lock { border: 1px solid #00ba7c; background: rgba(0, 186, 124, 0.1); box-shadow: 0 0 10px rgba(0, 186, 124, 0.2) inset; }
            .x-ops-bm-link { flex-grow: 1; font-size: 15px; font-weight: 500; color: rgb(231, 233, 234); text-decoration: none; display: block; }
            .x-ops-bm-star { font-size: 18px; color: #71767b; padding: 6px; border-radius: 50%; margin-left: 8px; }
        `;
        box.appendChild(style);

        const container = document.createElement('div');
        container.id = 'x-ops-bookmark-container';
        box.appendChild(container);

        // Initial render
        setTimeout(renderBookmarkList, 100);

        document.body.appendChild(box);
    }

    const searchBar = sidebar.querySelector('[role="search"]');

    // Deep Hook: Safely traverse up the DOM to inject the spacer
    if (spacer && searchBar && !spacer.isConnected) {
        let target = searchBar;
        let depth = 0;
        // Traverse up until we are just below the sidebar's main wrapper
        while (target.parentElement && target.parentElement !== sidebar.firstChild && depth < 12) {
            target = target.parentElement as Element;
            depth++;
        }
        if (target && target.parentElement) {
            target.after(spacer);
        }
    } else if (spacer && !spacer.isConnected) {
        // Fallback injection if search bar isn't found
        sidebar.appendChild(spacer);
    }

    // Box Syncing
    const spacerRect = spacer.getBoundingClientRect();
    const boxHeight = box.offsetHeight;
    const isSidebarVisible = window.getComputedStyle(sidebar).display !== 'none';

    if (isSidebarVisible) {
        box.style.width = (spacerRect.width > 0 ? spacerRect.width : 350) + 'px';
        box.style.display = 'block';

        if (spacerRect.width > 0) {
            // 1. Force the spacer to take up physical space to push native content down
            spacer.style.height = (boxHeight + 10) + 'px';
            // 2. Sync the Box to float exactly over the Spacer
            box.style.left = spacerRect.left + 'px';
            // 3. Keep it below the search bar (53px is X's sticky header height)
            box.style.top = Math.max(spacerRect.top, 53) + 'px';
        }
    } else {
        box.style.display = 'none';
    }

    updateTargetHighlight();
}

// ── Initialization ──
console.log("[X-Ops Walker X-Dashboard] Loaded. Waiting for PhantomState...");

const checkPhantomDashboard = setInterval(() => {
    if ((window as any).FoxPhantom) {
        clearInterval(checkPhantomDashboard);
        console.log("[X-Ops Walker X-Dashboard] PhantomState connected.");
        (window as any).FoxPhantom.onChange((config: any, isWalkerActive: boolean) => {
            const active = !!(isWalkerActive && config?.master && config?.xDashboard);
            if (active !== isDashboardEnabled) {
                isDashboardEnabled = active;
                if (isDashboardEnabled) {
                    installDashboard();
                } else {
                    removeDashboard();
                }
            }
        });
    }
}, 100);
