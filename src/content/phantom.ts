// src/content/phantom.ts

/**
 * Phantom Mode - Global State Manager
 * Synchronizes 'phantomMode' state across all tabs via chrome.storage.local
 */

export class PhantomState {
    public config: any = { master: false, xWalker: false, geminiWalker: false };
    private callbacks: ((config: any) => void)[] = [];

    constructor() {
        this.init();
    }

    private async init() {
        try {
            // Initial load
            const result = await browser.storage.local.get('phantom');
            this.config = result.phantom || { master: true, xWalker: true, geminiWalker: false };
            console.log("[X-Ops Walker PhantomState] Initializing. Config:", this.config);
            this.notify();

            // Listen for changes from other tabs or popup
            browser.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes.phantom) {
                    this.config = changes.phantom.newValue || { master: true, xWalker: true, geminiWalker: false };
                    console.log("[X-Ops Walker PhantomState] State Changed:", this.config);
                    this.notify();
                }
            });
        } catch (e) {
            console.error("X-Ops Walker: Error initializing Phantom State", e);
        }
    }

    public onChange(callback: (config: any) => void) {
        this.callbacks.push(callback);
        // Fire immediately with current state
        callback(this.config);
    }

    private notify() {
        this.callbacks.forEach(cb => cb(this.config));
    }
}

// Expose globally for domain scripts
if (typeof window !== 'undefined') {
    (window as any).FoxPhantom = new PhantomState();
}
