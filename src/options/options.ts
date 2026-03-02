declare var chrome: any;

interface Bookmark {
    name: string;
    url: string;
}

const form = document.getElementById('add-bookmark-form') as HTMLFormElement;
const nameInput = document.getElementById('bm-name') as HTMLInputElement;
const urlInput = document.getElementById('bm-url') as HTMLInputElement;
const listContainer = document.getElementById('bookmark-list') as HTMLUListElement;

async function loadBookmarks(): Promise<Bookmark[]> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['xOpsBookmarks'], (result: any) => {
            resolve(result.xOpsBookmarks || []);
        });
    });
}

async function saveBookmarks(bookmarks: Bookmark[]) {
    return new Promise<void>((resolve) => {
        chrome.storage.local.set({ xOpsBookmarks: bookmarks }, () => {
            resolve();
        });
    });
}

function renderBookmarks(bookmarks: Bookmark[]) {
    listContainer.innerHTML = '';

    if (bookmarks.length === 0) {
        listContainer.innerHTML = '<li class="bookmark-item"><div class="bookmark-info"><span class="bookmark-url">No bookmarks added yet.</span></div></li>';
        return;
    }

    bookmarks.forEach((bm, index) => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'bookmark-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'bookmark-name';
        nameSpan.textContent = bm.name;

        const urlSpan = document.createElement('span');
        urlSpan.className = 'bookmark-url';
        urlSpan.textContent = bm.url;

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(urlSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = async () => {
            const updated = [...bookmarks];
            updated.splice(index, 1);
            await saveBookmarks(updated);
            renderBookmarks(updated);
        };

        li.appendChild(infoDiv);
        li.appendChild(deleteBtn);

        listContainer.appendChild(li);
    });
}

async function init() {
    const bookmarks = await loadBookmarks();
    renderBookmarks(bookmarks);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const url = urlInput.value.trim();

        if (name && url) {
            const currentBookmarks = await loadBookmarks();
            currentBookmarks.push({ name, url });
            await saveBookmarks(currentBookmarks);

            nameInput.value = '';
            urlInput.value = '';

            renderBookmarks(currentBookmarks);
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
