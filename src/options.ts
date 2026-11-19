/**
 * X-Ops Walker: Options Page Logic
 * Tab switching, Bookmark (xOpsBookmarks) CRUD, Quick Add, Edit, and Reorder.
 * Centralized settings management for Global, Phantom, and ALM states.
 */

import { GlobalState, PhantomState, AlmConfig, DEFAULT_ALM_CONFIG, DEFAULT_GLOBAL_STATE, DEFAULT_PHANTOM_STATE } from './config/state';
interface Bookmark {
    title: string;
    url: string;
}

const STORAGE_KEY_BOOKMARKS = 'xOpsBookmarks';
const STORAGE_KEY_ALM = 'alm';

let editingIndex: number | null = null;

// --- i18n Utility ---
function t(key: string, subs?: string | string[]): string {
    return chrome.i18n.getMessage(key, subs) || key;
}

function applyI18n(): void {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const message = t(key);
            if (message && message !== key) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    (el as HTMLInputElement).placeholder = message;
                } else {
                    el.textContent = message;
                }
            }
        }
    });
}

// --- Cascade UI ---
function updateOptionsUI(walkerMode: boolean) {
    const bookmarkPanel = document.getElementById('panel-bookmarks');
    const phantomContainer = document.getElementById('phantom-container');

    if (bookmarkPanel) {
        if (walkerMode) {
            bookmarkPanel.classList.remove('disabled-section');
        } else {
            bookmarkPanel.classList.add('disabled-section');
        }
    }

    if (phantomContainer) {
        if (walkerMode) {
            phantomContainer.classList.remove('disabled-section');
        } else {
            phantomContainer.classList.add('disabled-section');
        }
    }
}

function updatePhantomUI(master: boolean) {
    const subSettings = document.getElementById('phantom-sub-settings');
    if (subSettings) {
        if (master) {
            subSettings.classList.remove('disabled-section');
        } else {
            subSettings.classList.add('disabled-section');
        }
    }
}

// --- Utility: URL Cleaning ---
function cleanUrl(url: string): string {
    try {
        let cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
        cleaned = cleaned.replace(/\/$/, '');
        return cleaned.toLowerCase().trim();
    } catch {
        return url.toLowerCase().trim();
    }
}

// --- Tab Logic ---
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.panel');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            panels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(`panel-${tabName}`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

// --- Bookmark CRUD & UI ---
async function loadBookmarks(): Promise<Bookmark[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY_BOOKMARKS);
    return result[STORAGE_KEY_BOOKMARKS] || [];
}

async function saveBookmarks(bookmarks: Bookmark[]) {
    await chrome.storage.local.set({ [STORAGE_KEY_BOOKMARKS]: bookmarks });
    renderBookmarks();
}

async function renderBookmarks() {
    const bookmarks = await loadBookmarks();
    const list = document.getElementById('bookmark-list')!;
    list.innerHTML = '';

    bookmarks.forEach((bm, index) => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';
        const isEditing = editingIndex === index;

        li.innerHTML = `
            <div class="bookmark-info" style="flex: 1; padding-right: 15px;">
                ${isEditing ? `
                    <input type="text" class="edit-input" id="edit-title-${index}" value="${bm.title.replace(/"/g, '&quot;')}" placeholder="Title">
                    <input type="text" class="edit-input" id="edit-url-${index}" value="${bm.url.replace(/"/g, '&quot;')}" placeholder="URL">
                ` : `
                    <div class="bookmark-title">${bm.title}</div>
                    <div class="bookmark-url">${bm.url}</div>
                `}
            </div>
            <div class="bookmark-actions">
                ${!isEditing ? `
                    <button class="btn btn-reorder btn-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn btn-reorder btn-down" data-index="${index}" ${index === bookmarks.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn btn-outline btn-edit" data-index="${index}">Edit</button>
                ` : `
                    <button class="btn btn-save" data-index="${index}">Save</button>
                    <button class="btn btn-cancel">Cancel</button>
                `}
                <button class="btn btn-danger btn-delete" data-index="${index}">Delete</button>
            </div>
        `;

        if (isEditing) {
            li.querySelector('.btn-save')!.addEventListener('click', async () => {
                const newTitle = (document.getElementById(`edit-title-${index}`) as HTMLInputElement).value.trim();
                const newUrl = cleanUrl((document.getElementById(`edit-url-${index}`) as HTMLInputElement).value.trim());
                if (newTitle && newUrl) {
                    const current = await loadBookmarks();
                    current[index] = { title: newTitle, url: newUrl };
                    editingIndex = null;
                    await saveBookmarks(current);
                }
            });
            li.querySelector('.btn-cancel')!.addEventListener('click', () => {
                editingIndex = null;
                renderBookmarks();
            });
        } else {
            li.querySelector('.btn-edit')!.addEventListener('click', () => {
                editingIndex = index;
                renderBookmarks();
            });
            li.querySelector('.btn-up:not(:disabled)')?.addEventListener('click', async () => {
                const current = await loadBookmarks();
                [current[index - 1], current[index]] = [current[index], current[index - 1]];
                await saveBookmarks(current);
            });
            li.querySelector('.btn-down:not(:disabled)')?.addEventListener('click', async () => {
                const current = await loadBookmarks();
                [current[index], current[index + 1]] = [current[index + 1], current[index]];
                await saveBookmarks(current);
            });
        }

        li.querySelector('.btn-delete')!.addEventListener('click', async () => {
            if (confirm('Delete this bookmark?')) {
                const current = await loadBookmarks();
                current.splice(index, 1);
                await saveBookmarks(current);
            }
        });

        list.appendChild(li);
    });
}

// --- Quick Add Logic ---
async function initQuickAdd() {
    const inputTitle = document.getElementById('input-title') as HTMLInputElement;
    const inputUrl = document.getElementById('input-url') as HTMLInputElement;
    const msg = document.getElementById('quick-add-msg')!;

    document.getElementById('btn-save-bookmark')!.addEventListener('click', async () => {
        const title = inputTitle.value.trim();
        const url = cleanUrl(inputUrl.value.trim());

        if (!title || !url) return;

        const current = await loadBookmarks();
        current.push({ title, url });
        await saveBookmarks(current);

        inputTitle.value = '';
        inputUrl.value = '';
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    });
}


async function loadAlmDomains(): Promise<string[]> {
    const res = await chrome.storage.local.get(STORAGE_KEY_ALM);
    const alm = res[STORAGE_KEY_ALM];

    if (alm && alm.excludeDomains) {
        return alm.excludeDomains;
    }

    return [...DEFAULT_ALM_CONFIG.excludeDomains];
}

async function saveAlmDomains(domains: string[]) {
    const res = await chrome.storage.local.get(STORAGE_KEY_ALM);
    const alm = res[STORAGE_KEY_ALM] || { enabled: true };

    alm.excludeDomains = domains;
    if ('heavyDomains' in alm) delete alm.heavyDomains; // マイグレーション掃除は維持

    await chrome.storage.local.set({ [STORAGE_KEY_ALM]: alm });
    renderAlmDomains();
}

async function renderAlmDomains() {
    const domains = await loadAlmDomains();
    const list = document.getElementById('alm-domain-list')!;
    list.innerHTML = '';

    domains.forEach((domain, index) => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';

        li.innerHTML = `
            <div class="bookmark-info" style="flex: 1; padding-right: 15px;">
                <div class="bookmark-title">${domain}</div>
            </div>
            <div class="bookmark-actions">
                <button class="btn btn-danger btn-delete-alm" data-index="${index}">${t('options_alm_delete_btn', '削除')}</button>
            </div>
        `;

        li.querySelector('.btn-delete-alm')!.addEventListener('click', async () => {
            if (confirm(`「${domain}」を保護リストから削除しますか？`)) {
                const current = await loadAlmDomains();
                current.splice(index, 1);
                await saveAlmDomains(current);
            }
        });

        list.appendChild(li);
    });
}

function initAlmDomainManager() {
    const inputDomain = document.getElementById('input-alm-domain') as HTMLInputElement;
    const msg = document.getElementById('alm-add-msg')!;

    document.getElementById('btn-add-alm-domain')!.addEventListener('click', async () => {
        let domain = inputDomain.value.trim().toLowerCase();
        if (!domain) return;

        domain = domain.replace(/^https?:\/\//, '').split('/')[0];

        const current = await loadAlmDomains();
        if (!current.includes(domain)) {
            current.push(domain);
            await saveAlmDomains(current);
        }

        inputDomain.value = '';
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    });
}

// --- General Settings Sync (Centralized) ---
async function initGeneralSettings() {
    const checkWalkerMode = document.getElementById('check-walker-mode') as HTMLInputElement;
    const checkAlmEnabled = document.getElementById('check-alm-enabled') as HTMLInputElement;
    const checkBlockOneTap = document.getElementById('check-block-one-tap') as HTMLInputElement;
    const checkSafetyEnter = document.getElementById('check-safety-enter') as HTMLInputElement;

    const checkPhantomMaster = document.getElementById('check-phantom-master') as HTMLInputElement;
    const checkPhantomX = document.getElementById('check-phantom-x') as HTMLInputElement;
    const checkPhantomXDashboard = document.getElementById('check-phantom-x-dashboard') as HTMLInputElement;

    const checkSimpleUIEnabled = document.getElementById('check-simple-ui-enabled') as HTMLInputElement;
    const checkSimpleUILeftNav = document.getElementById('check-simple-ui-left-nav') as HTMLInputElement;
    const checkSimpleUIRightSidebar = document.getElementById('check-simple-ui-right-sidebar') as HTMLInputElement;
    const checkSimpleUIPostExtras = document.getElementById('check-simple-ui-post-extras') as HTMLInputElement;
    const checkSimpleUIReplies = document.getElementById('check-simple-ui-replies') as HTMLInputElement;
    const checkSimpleUIMedia = document.getElementById('check-simple-ui-media') as HTMLInputElement;
    const checkSimpleUIHoverModal = document.getElementById('check-simple-ui-hover-modal') as HTMLInputElement;
    const checkSimpleUICardClick = document.getElementById('check-simple-ui-card-click') as HTMLInputElement;
    const checkSimpleUIHomeOverride = document.getElementById('check-simple-ui-home-override') as HTMLInputElement;
    const simpleUISubSettings = document.getElementById('simple-ui-sub-settings');

    function updateSimpleUISubState(enabled: boolean) {
        if (!simpleUISubSettings) return;
        if (enabled) simpleUISubSettings.classList.remove('disabled-section');
        else simpleUISubSettings.classList.add('disabled-section');
    }

    // 2. ストレージからの状態一括取得とフォールバックのDRY化
    const state = await chrome.storage.local.get(['global', 'phantom', STORAGE_KEY_ALM]);

    const globalState = (state.global as GlobalState) || JSON.parse(JSON.stringify(DEFAULT_GLOBAL_STATE));
    const phantomState = (state.phantom as PhantomState) || JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE));
    const defaultSimpleUI = DEFAULT_PHANTOM_STATE.xWalker.simpleUI;
    const simpleUI = { ...defaultSimpleUI, ...(phantomState.xWalker?.simpleUI || {}) };

    // 3. UIへの初期値反映
    checkWalkerMode.checked = !!globalState.walkerMode;
    checkBlockOneTap.checked = !!globalState.blockOneTap;
    checkSafetyEnter.checked = !!globalState.safetyEnter;

    checkPhantomMaster.checked = !!phantomState.master;
    checkPhantomX.checked = !!phantomState.xWalker?.enabled;
    checkPhantomXDashboard.checked = !!phantomState.xWalker?.rightColumnDashboard;

    if (checkSimpleUIEnabled) checkSimpleUIEnabled.checked = !!simpleUI.enabled;
    if (checkSimpleUILeftNav) checkSimpleUILeftNav.checked = !!simpleUI.hideLeftNavExtras;
    if (checkSimpleUIRightSidebar) checkSimpleUIRightSidebar.checked = !!simpleUI.hideRightSidebarExtras;
    if (checkSimpleUIPostExtras) checkSimpleUIPostExtras.checked = !!simpleUI.hidePostGrokAndViews;
    if (checkSimpleUIReplies) checkSimpleUIReplies.checked = !!simpleUI.hideDetailReplies;
    if (checkSimpleUIMedia) checkSimpleUIMedia.checked = !!simpleUI.hideMedia;
    if (checkSimpleUIHoverModal) checkSimpleUIHoverModal.checked = !!simpleUI.disableProfileHoverModal;
    if (checkSimpleUICardClick) checkSimpleUICardClick.checked = !!simpleUI.disableCardClickNavigation;
    if (checkSimpleUIHomeOverride) checkSimpleUIHomeOverride.checked = !!simpleUI.enableHomeOverrideRedirect;

    updateOptionsUI(!!globalState.walkerMode);
    updatePhantomUI(!!phantomState.master);
    updateSimpleUISubState(!!simpleUI.enabled);

    // 4. イベントリスナー群（ハードコード排除済み）
    checkWalkerMode.addEventListener('change', async () => {
        const cur = await chrome.storage.local.get('global');
        const g = (cur.global as GlobalState) || JSON.parse(JSON.stringify(DEFAULT_GLOBAL_STATE));
        g.walkerMode = checkWalkerMode.checked;
        await chrome.storage.local.set({ global: g });
        updateOptionsUI(g.walkerMode);
    });

    checkBlockOneTap.addEventListener('change', async () => {
        const cur = await chrome.storage.local.get('global');
        const g = (cur.global as GlobalState) || JSON.parse(JSON.stringify(DEFAULT_GLOBAL_STATE));
        g.blockOneTap = checkBlockOneTap.checked;
        await chrome.storage.local.set({ global: g });
    });

    checkSafetyEnter.addEventListener('change', async () => {
        const cur = await chrome.storage.local.get('global');
        const g = (cur.global as GlobalState) || JSON.parse(JSON.stringify(DEFAULT_GLOBAL_STATE));
        g.safetyEnter = checkSafetyEnter.checked;
        await chrome.storage.local.set({ global: g });
    });

    checkPhantomMaster.addEventListener('change', async () => {
        const cur = await chrome.storage.local.get('phantom');
        const p = (cur.phantom as PhantomState) || JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE));
        p.master = checkPhantomMaster.checked;
        await chrome.storage.local.set({ phantom: p });
        updatePhantomUI(p.master);
    });

    checkPhantomX.addEventListener('change', async () => {
        const cur = await chrome.storage.local.get('phantom');
        const p = (cur.phantom as PhantomState) || JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE));
        if (!p.xWalker) p.xWalker = JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE.xWalker));
        p.xWalker.enabled = checkPhantomX.checked;
        await chrome.storage.local.set({ phantom: p });
    });

    checkPhantomXDashboard.addEventListener('change', async () => {
        const cur = await chrome.storage.local.get('phantom');
        const p = (cur.phantom as PhantomState) || JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE));
        if (!p.xWalker) p.xWalker = JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE.xWalker));
        p.xWalker.rightColumnDashboard = checkPhantomXDashboard.checked;
        await chrome.storage.local.set({ phantom: p });
    });

    async function updateSimpleUIField(key: keyof typeof defaultSimpleUI, value: boolean) {
        const cur = await chrome.storage.local.get('phantom');
        const p = (cur.phantom as PhantomState) || JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE));
        if (!p.xWalker) p.xWalker = JSON.parse(JSON.stringify(DEFAULT_PHANTOM_STATE.xWalker));
        if (!p.xWalker.simpleUI) p.xWalker.simpleUI = { ...defaultSimpleUI };
        p.xWalker.simpleUI[key] = value;
        await chrome.storage.local.set({ phantom: p });
    }

    checkSimpleUIEnabled?.addEventListener('change', async () => {
        updateSimpleUISubState(checkSimpleUIEnabled.checked);
        await updateSimpleUIField('enabled', checkSimpleUIEnabled.checked);
    });
    checkSimpleUILeftNav?.addEventListener('change', () => updateSimpleUIField('hideLeftNavExtras', checkSimpleUILeftNav.checked));
    checkSimpleUIRightSidebar?.addEventListener('change', () => updateSimpleUIField('hideRightSidebarExtras', checkSimpleUIRightSidebar.checked));
    checkSimpleUIPostExtras?.addEventListener('change', () => updateSimpleUIField('hidePostGrokAndViews', checkSimpleUIPostExtras.checked));
    checkSimpleUIReplies?.addEventListener('change', () => updateSimpleUIField('hideDetailReplies', checkSimpleUIReplies.checked));
    checkSimpleUIMedia?.addEventListener('change', () => updateSimpleUIField('hideMedia', checkSimpleUIMedia.checked));
    checkSimpleUIHoverModal?.addEventListener('change', () => updateSimpleUIField('disableProfileHoverModal', checkSimpleUIHoverModal.checked));
    checkSimpleUICardClick?.addEventListener('change', () => updateSimpleUIField('disableCardClickNavigation', checkSimpleUICardClick.checked));
    checkSimpleUIHomeOverride?.addEventListener('change', () => updateSimpleUIField('enableHomeOverrideRedirect', checkSimpleUIHomeOverride.checked));

    // ALM設定の同期
    const alm = state[STORAGE_KEY_ALM] || { enabled: true };
    checkAlmEnabled.checked = !!alm.enabled;
    checkAlmEnabled.addEventListener('change', async () => {
        const res = await chrome.storage.local.get(STORAGE_KEY_ALM);
        const raw = res[STORAGE_KEY_ALM] || {};

        const saveAlm = {
            enabled: checkAlmEnabled.checked,
            excludeDomains: raw.excludeDomains || DEFAULT_ALM_CONFIG.excludeDomains
        };

        await chrome.storage.local.set({ [STORAGE_KEY_ALM]: saveAlm });
    });

    const manifest = chrome.runtime.getManifest();
    const extVersionEl = document.getElementById('extension-version');
    if (extVersionEl) extVersionEl.textContent = `Version: ${manifest.version}`;
}
// --- Initialize All ---
document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    initTabs();
    initQuickAdd();
    renderBookmarks();
    initGeneralSettings();
    initAlmDomainManager();
    renderAlmDomains();
});