const STORAGE_KEY = 'isWalkerMode';
const BLOCKER_KEY = 'blockGoogleOneTap';

// ── ALM Configuration ──
interface AlmConfig {
    enabled: boolean;
    ahkInfection: boolean;
    safetyEnter?: boolean;
    heavyDomains: string[];
}

const DEFAULT_ALM_CONFIG: AlmConfig = {
    enabled: true,
    ahkInfection: true,
    safetyEnter: false,
    heavyDomains: [
        'x.com',
        'twitter.com',
        'gemini.google.com',
        'chatgpt.com',
        'claude.ai',
        'chat.deepseek.com',
        'copilot.microsoft.com',
        'perplexity.ai',
        'grok.com',
        'figma.com',
        'canva.com',
        'notion.so',
        'www.youtube.com',
    ]
};

function t(key: string, subs?: string | string[]): string {
    return chrome.i18n.getMessage(key, subs) || key;
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

function updateMiniToggle(elementId: string, active: boolean): void {
    const toggle = document.getElementById(elementId)!;
    if (active) {
        toggle.classList.add('active');
        toggle.setAttribute('aria-checked', 'true');
    } else {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-checked', 'false');
    }
}

function updateDynamicDomainBtn(btn: HTMLElement, domain: string, isMonitored: boolean): void {
    if (isMonitored) {
        btn.textContent = t('popup_already_monitored', domain);
        btn.classList.add('active');
    } else {
        btn.textContent = t('popup_add_to_alm', domain);
        btn.classList.remove('active');
    }
}

async function init(): Promise<void> {
    // バージョンを manifest.json から動的取得
    const manifest = chrome.runtime.getManifest();
    document.getElementById('version-badge')!.textContent = `v${manifest.version}`;

    // i18n（textContent で安全に注入）
    document.getElementById('mode-label')!.textContent = t('popup_mode_label');
    document.getElementById('sc-title')!.textContent = t('popup_sc_title');
    document.getElementById('footer')!.textContent = t('popup_footer_hint');
    document.getElementById('blocker-label')!.textContent = t('popup_blocker_label');
    document.getElementById('alm-master-label')!.textContent = t('popup_smart_discard_label');
    document.getElementById('alm-ahk-label')!.textContent = t('popup_ahk_reclaim_label');
    document.getElementById('alm-safety-label')!.textContent = t('popup_safety_enter_label');
    document.getElementById('alm-safety-row')!.title = t('popup_safety_enter_desc');
    document.getElementById('advanced-settings')!.textContent = t('popup_advanced_settings');

    // Context-Aware UI i18n
    document.getElementById('protocol-x-title')!.textContent = t('protocol_x_title');
    document.getElementById('protocol-gemini-title')!.textContent = t('protocol_gemini_title');
    document.getElementById('protocol-none-msg')!.textContent = t('protocol_none_msg');

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
    const result = await chrome.storage.local.get([STORAGE_KEY, BLOCKER_KEY, 'alm', 'xWalker']);
    updateUI(!!result[STORAGE_KEY]);
    updateBlockerUI(!!result[BLOCKER_KEY]); // デフォルト false (OFF)

    // ALM 初期状態の読み込み
    const almConfig: AlmConfig = result.alm ?? DEFAULT_ALM_CONFIG;
    updateMiniToggle('alm-master-toggle', almConfig.enabled);
    updateMiniToggle('alm-ahk-toggle', almConfig.ahkInfection);
    updateMiniToggle('alm-safety-toggle', !!almConfig.safetyEnter);

    // プロトコル xWalker の初期状態読み込み
    const xWalkerConfig = result.xWalker ?? { enabled: true };
    const protocolXToggle = document.getElementById('toggle-protocol-x');
    if (protocolXToggle) {
        updateMiniToggle('toggle-protocol-x', xWalkerConfig.enabled);
    }

    // Dynamic Domain Button の初期化
    const domainBtn = document.getElementById('dynamic-domain-btn')!;
    let currentHostname = '';

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.url) {
            currentHostname = new URL(activeTab.url).hostname;
            // "www." プレフィックスを基本的には除去するが、既存仕様互換でそのまま判定
            const isMonitored = almConfig.heavyDomains.includes(currentHostname);
            updateDynamicDomainBtn(domainBtn, currentHostname, isMonitored);
            domainBtn.style.display = 'block';

            // Context-Aware UI Logic
            const protocolX = document.getElementById('protocol-x')!;
            const protocolGemini = document.getElementById('protocol-gemini')!;
            const protocolNone = document.getElementById('protocol-none')!;

            if (currentHostname.includes('x.com') || currentHostname.includes('twitter.com')) {
                protocolX.style.display = 'block';
            } else if (currentHostname.includes('gemini.google.com')) {
                protocolGemini.style.display = 'block';
            } else {
                protocolNone.style.display = 'block';
            }
        } else {
            domainBtn.style.display = 'none';
            document.getElementById('protocol-none')!.style.display = 'block';
        }
    } catch {
        domainBtn.style.display = 'none';
        document.getElementById('protocol-none')!.style.display = 'block';
    }

    // ── トグルイベント群 ──

    // Walker Mode トグル
    document.getElementById('toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get(STORAGE_KEY);
        const next = !res[STORAGE_KEY];
        await chrome.storage.local.set({ [STORAGE_KEY]: next });
        updateUI(next);
    });

    // Google One Tap ブロッカー トグル
    document.getElementById('blocker-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get(BLOCKER_KEY);
        const next = !res[BLOCKER_KEY];
        await chrome.storage.local.set({ [BLOCKER_KEY]: next });
        updateBlockerUI(next);
    });

    // ALM Master トグル
    document.getElementById('alm-master-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get('alm');
        const conf: AlmConfig = res.alm ?? DEFAULT_ALM_CONFIG;
        conf.enabled = !conf.enabled;
        await chrome.storage.local.set({ alm: conf });
        updateMiniToggle('alm-master-toggle', conf.enabled);
    });

    // ALM AHK Reclaim トグル
    document.getElementById('alm-ahk-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get('alm');
        const conf: AlmConfig = res.alm ?? DEFAULT_ALM_CONFIG;
        conf.ahkInfection = !conf.ahkInfection;
        await chrome.storage.local.set({ alm: conf });
        updateMiniToggle('alm-ahk-toggle', conf.ahkInfection);
    });

    // Chat SafetyEnter トグル
    document.getElementById('alm-safety-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get('alm');
        const conf: AlmConfig = res.alm ?? DEFAULT_ALM_CONFIG;
        conf.safetyEnter = !conf.safetyEnter;
        await chrome.storage.local.set({ alm: conf });
        updateMiniToggle('alm-safety-toggle', !!conf.safetyEnter);
    });

    // X Timeline Protocol トグル
    if (protocolXToggle) {
        protocolXToggle.addEventListener('click', async () => {
            const res = await chrome.storage.local.get('xWalker');
            const conf = res.xWalker ?? { enabled: true };
            conf.enabled = !conf.enabled;
            await chrome.storage.local.set({ xWalker: conf });
            updateMiniToggle('toggle-protocol-x', conf.enabled);
        });
    }

    // Dynamic Domain トグルボタン
    domainBtn.addEventListener('click', async () => {
        if (!currentHostname) return;
        const res = await chrome.storage.local.get('alm');
        const conf: AlmConfig = res.alm ?? DEFAULT_ALM_CONFIG;
        const isMonitored = conf.heavyDomains.includes(currentHostname);

        if (isMonitored) {
            conf.heavyDomains = conf.heavyDomains.filter(d => d !== currentHostname);
        } else {
            conf.heavyDomains.push(currentHostname);
        }

        await chrome.storage.local.set({ alm: conf });
        updateDynamicDomainBtn(domainBtn, currentHostname, !isMonitored);
    });

    // Advanced Settings Link
    document.getElementById('advanced-settings')!.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

document.addEventListener('DOMContentLoaded', init);
