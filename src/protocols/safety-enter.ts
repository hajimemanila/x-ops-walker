// src/protocols/safety-enter.ts
import { MiddlewareProtocol } from '../router';

let isSafetyEnterEnabled = false;
let isSynthesizing = false;

// ── 初期化シーケンス（WalkerのON/OFFに依存せず独立稼働） ──
try {
    chrome.storage.local.get('global', (res) => {
        if (!chrome.runtime.lastError && res.global && res.global.safetyEnter !== undefined) {
            isSafetyEnterEnabled = res.global.safetyEnter;
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && 'global' in changes) {
            const globalState = changes['global'].newValue;
            if (globalState && globalState.safetyEnter !== undefined) {
                isSafetyEnterEnabled = globalState.safetyEnter;
            }
        }
    });
} catch (e) {
    // Orphan context fail-safe
}

function showSafetyEnterOSD(target: HTMLElement) {
    const existing = document.getElementById('x-ops-safety-osd');
    if (existing) existing.remove();

    const osd = document.createElement('div');
    osd.id = 'x-ops-safety-osd';
    osd.style.cssText = `
        position: absolute; background: rgba(43, 45, 49, 0.95); color: #fff;
        font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 600;
        padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,140,0,0.4);
        pointer-events: none; z-index: 2147483647; opacity: 0; transition: opacity 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    osd.textContent = '💡 Ctrl+Enter で送信';
    const rect = target.getBoundingClientRect();
    osd.style.top = `${window.scrollY + rect.bottom - 25}px`;
    osd.style.left = `${window.scrollX + rect.right - 120}px`;
    document.body.appendChild(osd);

    requestAnimationFrame(() => {
        osd.style.opacity = '1';
        setTimeout(() => {
            osd.style.opacity = '0';
            setTimeout(() => osd.remove(), 200);
        }, 1500);
    });
}

function triggerForcedSend(target: HTMLElement) {
    isSynthesizing = true;
    try {
        const keyData = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
        target.dispatchEvent(new KeyboardEvent('keydown', keyData));
        target.dispatchEvent(new KeyboardEvent('keypress', keyData));
        target.dispatchEvent(new KeyboardEvent('keyup', keyData));

        setTimeout(() => {
            const sendBtn = target.closest('form')?.querySelector('button[type="submit"]') ||
                document.querySelector('button[data-testid="send-button"]') ||
                document.querySelector('button[aria-label="Send Message"]');
            if (sendBtn && !(sendBtn as HTMLButtonElement).disabled) {
                (sendBtn as HTMLElement).click();
            }
        }, 50);
    } finally {
        setTimeout(() => { isSynthesizing = false; }, 50);
    }
}

/**
 * Gatekeeperの最上流で呼ばれるミドルウェアフック。
 * イベントを処理（ブロック）した場合は true を返す。
 */
export class SafetyEnterMiddleware implements MiddlewareProtocol {
    handleEvent(event: KeyboardEvent): boolean {
        if (!isSafetyEnterEnabled || isSynthesizing || event.key !== 'Enter') return false;

        // IME変換中は絶対不可侵
        if (event.isComposing || event.keyCode === 229) return false;

        const target = event.target as HTMLElement;
        if (!target) return false;

        const isTextarea = target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable || !!target.closest('[contenteditable="true"]');
        if (!isTextarea && !isContentEditable) return false;

        // 【透過パス】Shift+Enter はサイト側の改行処理に任せる
        if (event.shiftKey) return false;

        // 波状ブロック: イベント伝播を完全に遮断
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();

        // 【送信強制】Ctrl+Enter (または Cmd+Enter)
        if (event.ctrlKey || event.metaKey) {
            if (event.type === 'keydown') triggerForcedSend(target);
            return true; // インターセプト完了
        }

        if (event.type === 'keydown') {
            showSafetyEnterOSD(target);
        }
        return true; // インターセプト完了（何もしない＝送信ブロック）
    }
}