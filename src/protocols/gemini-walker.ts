/**
 * Gemini Walker Protocol (v2.3.0)
 * Domain-Specific Protocol for gemini.google.com
 *
 * Architecture Compliance:
 *   - Stateless DOM-Driven: No currentIndex or element cache held in memory.
 *     J/K navigation is fully delegated to focusNextTarget().
 *     Star-jump (M) computes signatures JIT at call time.
 *   - Router Pattern: Implements DomainProtocol. kernel.ts only calls register().
 *   - Storage Boundary:
 *       chrome.storage.local → GeminiWalkerConfig (system settings, via onStateUpdate)
 *       window.localStorage  → Star data (per-container user context)
 *   - Zero Layout Residue: Fold uses CSS class toggle only. No rogue listeners.
 */

import { DomainProtocol } from '../router';
import { getCurrentTarget, focusNextTarget } from './utils/spatial-navigation';
import { GlobalState, PhantomState, DEFAULT_PHANTOM_STATE, GeminiWalkerConfig } from '../config/state';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Primary navigation targets: user messages and AI response content blocks.
 * NOTE: model-response is intentionally excluded — message-content is its
 * direct child and is the actual rendered text container. Including both would
 * cause the navigator to stutter (2 stops per AI turn).
 */
const TARGET_SELECTOR = 'user-query, message-content';

/**
 * Sidebar chat history entries. Gemini renders conversation links in
 * a side panel that has its own independent scroll container, so we
 * must NOT use focusNextTarget() for sidebar navigation (it operates
 * on the main scroll container). Instead we use a dedicated JIT query.
 */
const SIDEBAR_SELECTOR = 'side-navigation-item a[href], .conversation-list a[href]';

/** Obsidian URI content length limit. Longer URIs cause browser-level errors. */
const OBSIDIAN_CHAR_LIMIT = 4000;

/** localStorage key for per-container star (favourite) data. */
const STORAGE_KEY_STARS = 'gemini_walker_stars';

/** CSS class applied to a folded message element. */
const FOLD_CLASS = 'g-walker-folded';

/** CSS class applied to the currently focused navigation target. */
const FOCUS_CLASS = 'x-walker-focused';

/** ID of the injected stylesheet to avoid duplicate injection. */
const STYLE_ID = 'g-walker-style';

/**
 * Child selectors to temporarily hide when extracting plain text.
 * Removes UI chrome (copy buttons, icons, etc.) from innerText reads.
 */
const GARBAGE_SELECTORS = [
    'button',
    'a[href]',
    'svg',
    'img',
    '[role="button"]',
    '.mat-icon',
    '[aria-hidden="true"]',
    '[data-test-id*="button"]',
    '.sr-only',
    '.code-block-decoration',
    '.copy-code-button',
    '.bottom-container',
].join(', ');

// ── Module-scope state ────────────────────────────────────────────────────────
// ARCHITECTURE: Only a single boolean flag lives here. No element arrays, no
// index caches — DOM is the Single Source of Truth.

let isActive = false;

// ── CSS Injection ─────────────────────────────────────────────────────────────

function injectGeminiCSS(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        /* Folded message — collapsed to a single line with reduced opacity */
        .${FOLD_CLASS} {
            max-height: 3.2em !important;
            overflow: hidden !important;
            opacity: 0.35 !important;
            transition: max-height 0.3s ease, opacity 0.2s ease;
            cursor: pointer;
        }

        /* Focus indicator: outline is clipped by Gemini's overflow:hidden containers.
         * border-left + background-color is the proven Tampermonkey-era approach. */
        user-query.${FOCUS_CLASS},
        message-content.${FOCUS_CLASS} {
            border-left: 4px solid rgba(100, 180, 255, 0.8) !important;
            background-color: rgba(100, 180, 255, 0.05) !important;
            padding-left: 8px !important;
            border-radius: 4px;
            transition: background-color 0.15s ease;
        }
    `;
    document.documentElement.appendChild(style);
}

// ── Pure utility: clean text extraction ──────────────────────────────────────

/**
 * Extracts plain text from a target element by temporarily hiding decorative
 * child nodes (buttons, icons, etc.) and reading innerText.
 * Style is ALWAYS restored — even if an error occurs.
 *
 * For user-query elements, consecutive blank lines are collapsed to a single
 * newline to match the original Tampermonkey behaviour.
 */
function extractCleanText(el: Element): string {
    const garbage = Array.from(el.querySelectorAll<HTMLElement>(GARBAGE_SELECTORS));
    const hidden: Array<{ el: HTMLElement; prev: string }> = [];

    // Phase 1: hide garbage
    for (const g of garbage) {
        hidden.push({ el: g, prev: g.style.display });
        g.style.display = 'none';
    }

    let text = '';
    try {
        text = (el as HTMLElement).innerText?.trim() ?? '';
    } finally {
        // Phase 2: always restore — even on exception
        for (const { el: g, prev } of hidden) {
            g.style.display = prev;
        }
    }

    // Collapse multiple consecutive blank lines for user queries
    if (el.tagName.toLowerCase() === 'user-query') {
        text = text.replace(/\n{2,}/g, '\n');
    }

    return text;
}

// ── Pure utility: signature generation ───────────────────────────────────────

/**
 * Generates a lightweight, localStorage-friendly key for a message element.
 * Uses the first 30 and last 30 characters of extracted text as a signature.
 * This is intentionally simple — full hashing is unnecessary at this scale.
 */
function generateSignature(el: Element): string {
    const text = extractCleanText(el);
    const head = text.slice(0, 30);
    const tail = text.slice(-30);
    return `${head}||${tail}`;
}

// ── Star (favourite) storage helpers ─────────────────────────────────────────
// Stored in window.localStorage to respect Firefox Multi-Account Container
// isolation. Each container (account) maintains its own star set.

function loadStars(): Record<string, true> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_STARS) ?? '{}');
    } catch {
        return {};
    }
}

function saveStars(stars: Record<string, true>): void {
    localStorage.setItem(STORAGE_KEY_STARS, JSON.stringify(stars));
}

// ── Context extraction helpers ────────────────────────────────────────────────

/**
 * Walks backwards from the given element through previousElementSibling
 * until it finds a 'user-query' element, which represents the question
 * that prompted the AI answer.
 */
function findPrecedingUserQuery(el: Element): Element | null {
    let cursor: Element | null = el.previousElementSibling;
    while (cursor) {
        if (cursor.tagName.toLowerCase() === 'user-query') {
            return cursor;
        }
        cursor = cursor.previousElementSibling;
    }
    return null;
}

/**
 * Builds the clipboard/Obsidian payload for the given target element.
 * If the target is an AI response (message-content), the preceding
 * user-query is also extracted and formatted as a Markdown Q&A pair.
 */
function buildContextText(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const answerText = extractCleanText(el);

    if (tag === 'message-content') {
        const questionEl = findPrecedingUserQuery(el);
        if (questionEl) {
            const questionText = extractCleanText(questionEl);
            return `**Q:** ${questionText}\n\n**A:** ${answerText}`;
        }
    }

    return answerText;
}

// ── Visual feedback ───────────────────────────────────────────────────────────

function flashFeedback(el: Element, color: string): void {
    const htmlEl = el as HTMLElement;
    if (!htmlEl?.isConnected) return;
    const prev = htmlEl.style.backgroundColor;
    htmlEl.style.backgroundColor = color;
    setTimeout(() => {
        if (htmlEl.isConnected) htmlEl.style.backgroundColor = prev;
    }, 220);
}

// ── Sidebar navigation (independent JIT logic) ───────────────────────────────
// ARCHITECTURE: Sidebar lives in its own scroll container. Using focusNextTarget()
// here would corrupt main-area spatial navigation. We use a dedicated JIT query
// that finds the current active link and clicks the adjacent sibling.

function navigateSidebar(direction: 1 | -1): boolean {
    const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(SIDEBAR_SELECTOR)
    ).filter(a => a.isConnected && a.offsetWidth > 0 && a.offsetHeight > 0);

    if (links.length === 0) return false;

    const currentHref = window.location.pathname;

    // Find the sidebar entry that matches the current page URL
    let currentIdx = links.findIndex(a => {
        try {
            return new URL(a.href).pathname === currentHref;
        } catch {
            return false;
        }
    });

    // If no current page match, fall back to the visually focused sidebar item
    if (currentIdx === -1) {
        const focused = document.querySelector<HTMLElement>(
            SIDEBAR_SELECTOR + ':focus, side-navigation-item.active a[href]'
        );
        if (focused) currentIdx = links.indexOf(focused as HTMLAnchorElement);
    }

    const nextIdx = Math.max(0, Math.min(
        currentIdx === -1
            ? (direction === 1 ? 0 : links.length - 1)
            : currentIdx + direction,
        links.length - 1
    ));

    const target = links[nextIdx];
    if (target && nextIdx !== currentIdx) {
        target.click();
        return true;
    }

    return false;
}

// ── Protocol class ────────────────────────────────────────────────────────────

export class GeminiWalkerProtocol implements DomainProtocol {

    matches(hostname: string): boolean {
        return hostname.includes('gemini.google.com');
    }

    // ── State lifecycle hook ──────────────────────────────────────────────────

    onStateUpdate(global: GlobalState, phantom: PhantomState): void {
        const defaultConfig = DEFAULT_PHANTOM_STATE.geminiWalker as GeminiWalkerConfig;
        const raw = (phantom as any).geminiWalker as GeminiWalkerConfig | undefined;

        // Deep merge with defaults — guards against missing keys in stored data
        const config: GeminiWalkerConfig = {
            enabled: raw?.enabled ?? defaultConfig.enabled,
        };

        const shouldBeActive = !!global.walkerMode && !!phantom.master && config.enabled;

        if (shouldBeActive && !isActive) {
            // Activating
            isActive = true;
            injectGeminiCSS();
            console.log('[X-Ops Walker] 💎 Gemini Protocol: ACTIVE');
        } else if (!shouldBeActive && isActive) {
            // Deactivating — clean up visual residue
            isActive = false;
            document.querySelectorAll(`.${FOCUS_CLASS}`).forEach(el => {
                el.classList.remove(FOCUS_CLASS);
            });
            console.log('[X-Ops Walker] 💎 Gemini Protocol: INACTIVE');
        } else if (shouldBeActive) {
            // Re-activating after a state change with no effective toggle
            injectGeminiCSS();
        }
    }

    // ── Key handler ───────────────────────────────────────────────────────────

    handleKey(event: KeyboardEvent, key: string, shift: boolean, container: Element): boolean {
        if (!isActive) return false;

        // ── Z: Scroll to bottom of chat ───────────────────────────────────────
        // Restores the behaviour lost when gemini.google.com was removed from
        // AiChatProtocol. Uses container (not window) for internal-scroll SPAs.
        if (key === 'z' && !shift) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            return true;
        }

        // ── J / K: Message navigation ────────────────────────────────────────
        // Delegated to focusNextTarget. container is passed as the 5th argument
        // so that scroll targets Gemini's internal div, not window.
        if (key === 'j' || key === 'k') {
            const direction = key === 'j' ? 1 : -1;
            focusNextTarget(TARGET_SELECTOR, direction, 120, FOCUS_CLASS, container);
            return true;
        }

        // ── C: Context copy ───────────────────────────────────────────────────
        // For AI responses: prepends the preceding user-query in Markdown format.
        if (key === 'c' && !shift) {
            const el = getCurrentTarget(TARGET_SELECTOR, FOCUS_CLASS, container);
            if (!el?.isConnected) return true;

            const text = buildContextText(el);
            navigator.clipboard.writeText(text).then(() => {
                flashFeedback(el, 'rgba(100, 200, 255, 0.22)');
            }).catch(err => {
                console.error('[Gemini Walker] Clipboard write failed:', err);
            });
            return true;
        }

        // ── O: Obsidian export ────────────────────────────────────────────────
        // Same extraction as C, with a 4000-character safety trim.
        // If trimmed, a Callout warning banner is prepended to signal truncation.
        if (key === 'o' && !shift) {
            const el = getCurrentTarget(TARGET_SELECTOR, FOCUS_CLASS, container);
            if (!el?.isConnected) return true;

            let text = buildContextText(el);

            if (text.length > OBSIDIAN_CHAR_LIMIT) {
                const trimmedText = text.slice(0, OBSIDIAN_CHAR_LIMIT);
                const originalLength = text.length;
                text = `> [!warning] **TRIMMED**\n> Content was truncated from ${originalLength} to ${OBSIDIAN_CHAR_LIMIT} characters to fit Obsidian URI limits.\n\n${trimmedText}`;
            }

            const title = encodeURIComponent(
                `Gemini — ${new Date().toISOString().slice(0, 10)}`
            );
            const content = encodeURIComponent(text);
            const uri = `obsidian://new?name=${title}&content=${content}`;

            window.location.href = uri;
            return true;
        }

        // ── N: Star toggle ────────────────────────────────────────────────────
        // Stored in localStorage — per-container isolation for Firefox users.
        if (key === 'n' && !shift) {
            const el = getCurrentTarget(TARGET_SELECTOR, FOCUS_CLASS, container);
            if (!el?.isConnected) return true;

            const sig = generateSignature(el);
            const stars = loadStars();
            const wasStarred = !!stars[sig];

            if (wasStarred) {
                delete stars[sig];
                flashFeedback(el, 'rgba(128, 128, 128, 0.25)');
            } else {
                stars[sig] = true;
                flashFeedback(el, 'rgba(255, 172, 48, 0.3)');
            }

            saveStars(stars);
            return true;
        }

        // ── M: Jump to next starred element ──────────────────────────────────
        // ARCHITECTURE: No star-index is cached. All signatures computed JIT
        // at call time from live DOM. Works correctly even after scroll/re-render.
        if (key === 'm' && !shift) {
            const stars = loadStars();
            if (Object.keys(stars).length === 0) return true;

            // Get all valid targets at this exact moment in DOM time
            const allTargets = Array.from(
                document.querySelectorAll<Element>(TARGET_SELECTOR)
            ).filter(el => {
                if (!el.isConnected) return false;
                const rect = el.getBoundingClientRect();
                return rect.height > 0 && rect.width > 0;
            });

            if (allTargets.length === 0) return true;

            const currentEl = getCurrentTarget(TARGET_SELECTOR, FOCUS_CLASS, container);
            const currentIdx = currentEl ? allTargets.indexOf(currentEl) : -1;

            // Search forward from current position, wrapping around
            for (let offset = 1; offset <= allTargets.length; offset++) {
                const idx = (currentIdx + offset) % allTargets.length;
                const candidate = allTargets[idx];
                const sig = generateSignature(candidate); // JIT signature calculation
                if (stars[sig]) {
                    // Remove focus class from current element
                    currentEl?.classList.remove(FOCUS_CLASS);
                    // Apply focus class and scroll to starred element.
                    // scrollIntoView works regardless of which container owns the scroll.
                    candidate.classList.add(FOCUS_CLASS);
                    candidate.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    return true;
                }
            }

            // No starred element found — silent no-op
            return true;
        }

        // ── L: Toggle fold on current target ─────────────────────────────────
        if (key === 'l' && !shift) {
            const el = getCurrentTarget(TARGET_SELECTOR, FOCUS_CLASS, container);
            if (!el?.isConnected) return true;
            el.classList.toggle(FOLD_CLASS);
            return true;
        }

        // ── Shift+L: Bulk fold / unfold all targets ───────────────────────────
        if (key === 'l' && shift) {
            const all = Array.from(document.querySelectorAll<Element>(TARGET_SELECTOR));
            // If ANY element is unfolded, fold everything. Otherwise unfold.
            const anyUnfolded = all.some(el => !el.classList.contains(FOLD_CLASS));
            all.forEach(el => {
                if (anyUnfolded) {
                    el.classList.add(FOLD_CLASS);
                } else {
                    el.classList.remove(FOLD_CLASS);
                }
            });
            return true;
        }

        // ── U / I: Sidebar chat history navigation ────────────────────────────
        // Uses independent JIT querySelectorAll logic — NOT focusNextTarget —
        // because the sidebar lives in a separate scroll container.
        if (key === 'u' || key === 'i') {
            const direction = key === 'u' ? -1 : 1; // U = up (previous), I = down (next)
            navigateSidebar(direction);
            return true;
        }

        // ── /: Focus input area ──────────────────────────────────────────────
        if (key === '/') {
            const inputEl = (
                document.querySelector<HTMLElement>('rich-textarea [contenteditable="true"]') ??
                document.querySelector<HTMLElement>('rich-textarea') ??
                document.querySelector<HTMLElement>('[data-testid="chat-input"] [contenteditable]') ??
                document.querySelector<HTMLElement>('textarea')
            );
            if (inputEl) {
                inputEl.focus();
            }
            return true;
        }

        return false;
    }
}
