/**
 * X-Ops Walker: Options Page Logic
 * Tab switching, Bookmark (xOpsBookmarks) CRUD, Quick Add, Edit, and Reorder.
 */

interface Bookmark {
    title: string;
    url: string;
}

const STORAGE_KEY_BOOKMARKS = 'xOpsBookmarks';
const STORAGE_KEY_WALKER_MODE = 'isWalkerMode';
const STORAGE_KEY_ALM = 'alm';

let editingIndex: number | null = null;

// --- Utility: URL Cleaning (Compatible with x-timeline.ts logic) ---
function cleanUrl(url: string): string {
    try {
        // Remove protocol and normalize
        let cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
        // Remove trailing slash
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

            // Update Nav
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update Panels
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
                    <button class="btn btn-outline btn-edit" data-index="${index}">編集</button>
                ` : `
                    <button class="btn btn-save" data-index="${index}">保存</button>
                    <button class="btn btn-cancel">戻る</button>
                `}
                <button class="btn btn-danger btn-delete" data-index="${index}">削除</button>
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
            if (confirm('削除しますか？')) {
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
    const btnQuickAdd = document.getElementById('btn-quick-add')!;
    const inputTitle = document.getElementById('input-title') as HTMLInputElement;
    const inputUrl = document.getElementById('input-url') as HTMLInputElement;
    const msg = document.getElementById('quick-add-msg')!;

    btnQuickAdd.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab && tab.url && tab.title) {
            inputTitle.value = tab.title;
            inputUrl.value = cleanUrl(tab.url);

            // Immediate feedback: Highlight fields
            inputTitle.style.borderColor = 'var(--accent-blue)';
            inputUrl.style.borderColor = 'var(--accent-blue)';
            setTimeout(() => {
                inputTitle.style.borderColor = '';
                inputUrl.style.borderColor = '';
            }, 1000);
        }
    });

    document.getElementById('btn-save-bookmark')!.addEventListener('click', async () => {
        const title = inputTitle.value.trim();
        const url = cleanUrl(inputUrl.value.trim());

        if (!title || !url) return;

        const current = await loadBookmarks();
        current.push({ title, url });
        await saveBookmarks(current);

        // Clear and show message
        inputTitle.value = '';
        inputUrl.value = '';
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    });
}

// --- General Settings Sync ---
async function initGeneralSettings() {
    const checkWalkerMode = document.getElementById('check-walker-mode') as HTMLInputElement;
    const checkAlmEnabled = document.getElementById('check-alm-enabled') as HTMLInputElement;

    const state = await chrome.storage.local.get([STORAGE_KEY_WALKER_MODE, STORAGE_KEY_ALM]);

    checkWalkerMode.checked = !!state[STORAGE_KEY_WALKER_MODE];
    checkWalkerMode.addEventListener('change', async () => {
        await chrome.storage.local.set({ [STORAGE_KEY_WALKER_MODE]: checkWalkerMode.checked });
    });

    const alm = state[STORAGE_KEY_ALM] || { enabled: true };
    checkAlmEnabled.checked = !!alm.enabled;
    checkAlmEnabled.addEventListener('change', async () => {
        const currentAlm = (await chrome.storage.local.get(STORAGE_KEY_ALM))[STORAGE_KEY_ALM] || { enabled: true };
        currentAlm.enabled = checkAlmEnabled.checked;
        await chrome.storage.local.set({ [STORAGE_KEY_ALM]: currentAlm });
    });

    // Version info
    const manifest = chrome.runtime.getManifest();
    document.getElementById('extension-version')!.textContent = `Version: ${manifest.version}`;
}

// --- Initialize All ---
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initQuickAdd();
    renderBookmarks();
    initGeneralSettings();
});
