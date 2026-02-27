const STORAGE_KEY = 'isWalkerMode';
const BLOCKER_KEY = 'blockGoogleOneTap';

function t(key: string): string {
    return browser.i18n.getMessage(key) || key;
}

function updateUI(active: boolean): void {
    const toggle = document.getElementById('toggle')!;
    const statusText = document.getElementById('status-text')!;
    const statusDot = document.getElementById('status-dot')!;
    const detail = document.getElementById('status-detail')!;

    if (active) {
        toggle.classList.add('active');
        toggle.setAttribute('aria-checked', 'true');
        statusText.textContent = t('popup_status_on');
        statusText.className = 'on';
        statusDot.className = 'on';
        detail.textContent = t('popup_detail_on');
    } else {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-checked', 'false');
        statusText.textContent = t('popup_status_off');
        statusText.className = 'off';
        statusDot.className = 'off';
        detail.textContent = t('popup_detail_off');
    }
}

function updateBlockerUI(active: boolean): void {
    const toggle = document.getElementById('blocker-toggle')!;
    if (active) {
        toggle.classList.add('active');
        toggle.setAttribute('aria-checked', 'true');
    } else {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-checked', 'false');
    }
}

async function init(): Promise<void> {
    // バージョンを manifest.json から動的取得
    const manifest = browser.runtime.getManifest();
    document.getElementById('version-badge')!.textContent = `v${manifest.version}`;

    // i18n（textContent で安全に注入）
    document.getElementById('mode-label')!.textContent = t('popup_mode_label');
    document.getElementById('sc-title')!.textContent = t('popup_sc_title');
    document.getElementById('footer')!.textContent = t('popup_footer_hint');
    document.getElementById('blocker-label')!.textContent = t('popup_blocker_label');

    // sc-hint: "Press [F] on any page…" を DOM で構築（innerHTML 回避）
    const scHint = document.getElementById('sc-hint')!;
    const beforeText = document.createTextNode(t('popup_sc_hint_before') + ' ');
    const keyBadge = document.createElement('span');
    keyBadge.className = 'key-badge';
    keyBadge.textContent = 'F';
    const afterText = document.createTextNode(' ' + t('popup_sc_hint_after'));
    scHint.appendChild(beforeText);
    scHint.appendChild(keyBadge);
    scHint.appendChild(afterText);

    // Walker Mode の初期状態読み込み
    const result = await browser.storage.local.get([STORAGE_KEY, BLOCKER_KEY]);
    updateUI(!!result[STORAGE_KEY]);
    updateBlockerUI(!!result[BLOCKER_KEY]); // デフォルト false (OFF)

    // Walker Mode トグル
    document.getElementById('toggle')!.addEventListener('click', async () => {
        const res = await browser.storage.local.get(STORAGE_KEY);
        const next = !res[STORAGE_KEY];
        await browser.storage.local.set({ [STORAGE_KEY]: next });
        updateUI(next);
    });

    // Google One Tap ブロッカー トグル
    document.getElementById('blocker-toggle')!.addEventListener('click', async () => {
        const res = await browser.storage.local.get(BLOCKER_KEY);
        const next = !res[BLOCKER_KEY];
        await browser.storage.local.set({ [BLOCKER_KEY]: next });
        updateBlockerUI(next);
    });
}

document.addEventListener('DOMContentLoaded', init);
