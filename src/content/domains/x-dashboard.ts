/**
 * X.com Right Column Dashboard
 * Domain Protocol for Phantom Mode
 */

let isDashboardEnabled = false;
let pollingInterval: number | null = null;

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
    if (box) box.style.display = 'none';
}

function pollAndSync() {
    if (!isDashboardEnabled) {
        removeDashboard();
        return;
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;

    // Find the search bar container to insert after it
    // The search form usually resides in a fixed top-level container in the sidebar.
    const searchForm = sidebar.querySelector('form[role="search"]');
    const searchContainer = searchForm?.closest('.css-175oi2r.r-1p0dtai, .css-175oi2r.r-1aqg1i6, .css-175oi2r');

    let spacer = document.getElementById('x-ops-dashboard-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'x-ops-dashboard-spacer';
        // Give it reasonable dimensions
        spacer.style.height = '320px';
        spacer.style.width = '100%';
        spacer.style.marginTop = '12px';
        spacer.style.opacity = '0';
        spacer.style.pointerEvents = 'none';

        if (searchContainer && searchContainer.parentNode) {
            searchContainer.parentNode.insertBefore(spacer, searchContainer.nextSibling);
        } else {
            sidebar.appendChild(spacer);
        }
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

        const placeholder = document.createElement('div');
        placeholder.textContent = 'Stats & Bookmarks will appear here...';
        placeholder.style.color = 'rgba(255, 255, 255, 0.5)';
        placeholder.style.fontSize = '12px';
        box.appendChild(placeholder);

        document.body.appendChild(box);
    }

    box.style.display = 'block';

    // Sync position exactly over the spacer
    const spacerRect = spacer.getBoundingClientRect();
    const boxHeight = box.offsetHeight;

    if (spacerRect.width > 0) {
        // 1. Force the spacer to take up physical space in the native DOM
        spacer.style.height = (boxHeight + 10) + 'px';

        // 2. Sync the Box to float exactly over the Spacer
        box.style.width = spacerRect.width + 'px';
        box.style.left = spacerRect.left + 'px';

        // 3. Keep it below the search bar (53px is X's sticky header height)
        box.style.top = Math.max(spacerRect.top, 53) + 'px';
    }
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
