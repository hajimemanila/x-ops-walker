'use strict';

const STORAGE_KEY = 'isWalkerMode';

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

async function init(): Promise<void> {
    // i18n: 静的テキストを messages.json から注入
    document.getElementById('mode-label')!.textContent = t('popup_mode_label');
    document.getElementById('sc-title')!.textContent = t('popup_sc_title');
    document.getElementById('footer')!.textContent = t('popup_footer_hint');

    // ショートカットヒント（F キーバッジ付き）
    const scHint = document.getElementById('sc-hint')!;
    scHint.innerHTML = t('popup_sc_hint_before')
        + ' <span class="key-badge">F</span> '
        + t('popup_sc_hint_after');

    // ストレージから現在の状態を読み込む
    const result = await browser.storage.local.get(STORAGE_KEY);
    updateUI(!!result[STORAGE_KEY]);

    // トグルクリック → ストレージ書き込み（kernel.ts の onChanged が自動同期）
    document.getElementById('toggle')!.addEventListener('click', async () => {
        const res = await browser.storage.local.get(STORAGE_KEY);
        const next = !res[STORAGE_KEY];
        await browser.storage.local.set({ [STORAGE_KEY]: next });
        updateUI(next);
    });
}

document.addEventListener('DOMContentLoaded', init);
