// src/content/phantom.ts

/**
 * Phantom Mode - Global State Manager
 * Synchronizes 'phantomMode' state across all tabs via chrome.storage.local
 */

export class PhantomState {
    public config: any = { master: false, xWalker: false, geminiWalker: false };
    public isWalkerActive: boolean = false;
    private callbacks: ((config: any, isWalkerActive: boolean) => void)[] = [];

    constructor() {
        this.init();
    }

    private async init() {
        try {
            // Initial load
            const result = await browser.storage.local.get(['phantom', 'global']);
            this.config = result.phantom || { master: true, xWalker: true, geminiWalker: false };
            this.isWalkerActive = !!result.global?.walkerMode;
            console.log("[X-Ops Walker PhantomState] Initializing. Config:", this.config, "WalkerActive:", this.isWalkerActive);
            this.notify();

            // Listen for changes from other tabs or popup
            browser.storage.onChanged.addListener((changes, area) => {
                if (area === 'local') {
                    let changed = false;
                    if (changes.phantom) {
                        this.config = changes.phantom.newValue || { master: true, xWalker: true, geminiWalker: false };
                        changed = true;
                    }
                    if (changes.global) {
                        this.isWalkerActive = !!changes.global.newValue?.walkerMode;
                        changed = true;
                    }
                    if (changed) {
                        console.log("[X-Ops Walker PhantomState] State Changed:", this.config, "WalkerActive:", this.isWalkerActive);
                        this.notify();
                    }
                }
            });
        } catch (e) {
            console.error("X-Ops Walker: Error initializing Phantom State", e);
        }
    }

    public onChange(callback: (config: any, isWalkerActive: boolean) => void) {
        this.callbacks.push(callback);
        // Fire immediately with current state
        callback(this.config, this.isWalkerActive);
    }

    private notify() {
        this.callbacks.forEach(cb => cb(this.config, this.isWalkerActive));
    }
}

export class PhantomUI {
    private static observer: MutationObserver | null = null;
    private static isPrefixing: boolean = false;

    public static update(isActive: boolean) {
        console.log("[X-Ops Walker PhantomState] UI Updated. isPhantom:", isActive);
        this.updateIndicator(isActive);
        this.updateTitle(isActive);
    }

    private static updateIndicator(isActive: boolean) {
        // Dispatch CustomEvent to kernel.ts which owns the closed Shadow DOM
        const event = new CustomEvent('x-ops-state-change', {
            detail: { isPhantom: isActive }
        });
        window.dispatchEvent(event);
    }

    private static updateTitle(isActive: boolean) {
        if (isActive) {
            if (!this.observer) {
                this.observer = new MutationObserver(() => this.enforceTitlePrefix());
                const titleEl = document.querySelector('title');
                if (titleEl) {
                    this.observer.observe(titleEl, { childList: true, subtree: true, characterData: true });
                }
            }
            this.enforceTitlePrefix();
        } else {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            if (document.title.startsWith('🎮')) {
                document.title = document.title.replace(/^🎮/, '');
            }
        }
    }

    private static enforceTitlePrefix() {
        if (this.isPrefixing) return;
        if (!document.title.startsWith('🎮')) {
            this.isPrefixing = true;
            document.title = '🎮' + document.title;
            this.isPrefixing = false;
        }
    }
}

// Expose globally for domain scripts
if (typeof window !== 'undefined') {
    (window as any).FoxPhantom = new PhantomState();
    (window as any).PhantomUI = PhantomUI;

    // Phantom Mode Toggle - Dedicated Key 'p'
    function isPhantomInputActive(): boolean {
        const activeEl = document.activeElement;
        if (!activeEl) return false;
        return ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) || (activeEl as HTMLElement).isContentEditable;
    }

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
        if (isPhantomInputActive()) return;

        const phantomInstance = (window as any).FoxPhantom;
        if (!phantomInstance || !phantomInstance.isWalkerActive) return;

        // Toggle on 'p' or 'P'
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            e.stopPropagation();

            browser.storage.local.get('phantom').then((res) => {
                const config = res.phantom || { master: true, xWalker: true, geminiWalker: false };
                config.master = !config.master; // Toggle global master Phantom state
                browser.storage.local.set({ phantom: config });
            });
        }
    }, true);
}
