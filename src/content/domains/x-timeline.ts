/**
 * X.com Timeline Walker
 * Domain Protocol for Phantom Mode
 */

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
let indicatorDiv: HTMLElement | null = null;
let backspaceTimer: number | null = null;
let isBackspaceHeld = false;
let originalTitle = "";

// CSS
const style = document.createElement('style');
style.textContent = `
    body.x-walker-active article[data-testid="tweet"] { opacity: ${CONFIG.zenOpacity}; transition: opacity 0.2s ease, box-shadow 0.2s ease; }
    body.x-walker-active article[data-testid="tweet"].x-walker-focused { opacity: 1 !important; background-color: rgba(255, 255, 255, 0.03); }
`;
document.head.appendChild(style);

// Removed old indicator CSS and createIndicator function

function setWalkerState(enabled: boolean) {
    if (isActive === enabled) return;
    isActive = enabled;

    // Call unified PhantomUI instead of old indicator
    if ((window as any).PhantomUI) {
        (window as any).PhantomUI.update(enabled);
    }

    if (isActive) {
        document.body.classList.add('x-walker-active');
        updateTargets();
        if (window.scrollY < 200) currentIndex = -1; else findClosestIndex();
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
        if (CONFIG.skipAds && (text.includes('プロモーション') || text.includes('Promoted'))) return false;
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

// Global reset handled by kernel.ts via 'x-ops-global-reset' event
window.addEventListener('x-ops-global-reset', () => {
    if (!isActive) return;
    forceClearFocus();
    currentIndex = -1;
});

// Removed xOpsHandleDelete to be replaced by inline Backspace Overdrive

function isInputActive(): boolean {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    return ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) || (activeEl as HTMLElement).isContentEditable;
}

window.addEventListener('keydown', (e) => {
    if (!isActive) return;
    if (isInputActive()) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

    if (['KeyI', 'KeyU', 'KeyK', 'KeyJ', 'KeyL', 'KeyO', 'KeyN', 'KeyM'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (e.code === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();

        if (e.repeat) return; // Prevent multiple triggers

        isBackspaceHeld = true;
        resyncCurrentIndex();
        const article = targetArticles[currentIndex];
        if (!article) return;

        // Visual Feedback (Tab Title)
        originalTitle = document.title;
        document.title = "⚠️ DRS ACTIVE ⚠️";

        // Phase A: Immediate open menu
        const caret = article.querySelector('[data-testid="caret"]') as HTMLElement;
        if (caret) caret.click();

        setTimeout(() => {
            const menu = document.querySelector('[role="menu"]');
            if (!menu) return;
            const deleteItems = Array.from(menu.querySelectorAll('[role="menuitem"]'));
            const deleteItem = deleteItems.find(el => el.textContent?.match(/削除|Delete/)) as HTMLElement;
            if (deleteItem) deleteItem.click();
        }, 100);

        // Phase B: Timer 600ms
        backspaceTimer = window.setTimeout(() => {
            if (isBackspaceHeld) {
                // Phase C: Auto-Click
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

                // Cleanup visual feedback
                if (document.title === "⚠️ DRS ACTIVE ⚠️") document.title = originalTitle;
                isBackspaceHeld = false;
            }
        }, 600);
        return;
    }

    switch (e.code) {
        case 'KeyI': case 'KeyU': e.preventDefault(); resyncCurrentIndex(); focusArticle(currentIndex - 1); break;
        case 'KeyK': case 'KeyJ': e.preventDefault(); resyncCurrentIndex(); focusArticle(currentIndex + 1); break;
        case 'KeyL': e.preventDefault(); executeAction('like'); break;
        case 'KeyO': e.preventDefault(); executeAction('repost'); break;
        case 'KeyN': window.dispatchEvent(new CustomEvent('x-ops-toggle-star')); break;
        case 'KeyM': window.dispatchEvent(new CustomEvent('x-ops-next-star')); break;
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

        // Restore title if not already restored
        if (document.title === "⚠️ DRS ACTIVE ⚠️") {
            document.title = originalTitle;
        }
    }
}, true);

// Init
// Removed createIndicator()

console.log("[X-Ops Walker X-Timeline] Loaded. Waiting for PhantomState...");

// Wait for PhantomState to load from phantom.ts
const checkPhantom = setInterval(() => {
    if ((window as any).FoxPhantom) {
        clearInterval(checkPhantom);
        console.log("[X-Ops Walker X-Timeline] PhantomState connected. Current config:", (window as any).FoxPhantom.config);
        (window as any).FoxPhantom.onChange((config: any, isWalkerActive: boolean) => {
            console.log("[X-Ops Walker X-Timeline] PhantomState onChange fired:", config, isWalkerActive);
            const active = !!(isWalkerActive && config?.master && config?.xWalker);
            setWalkerState(active);
        });
    }
}, 100);
