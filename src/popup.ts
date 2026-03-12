import { GlobalState, PhantomState, AlmConfig, DEFAULT_ALM_CONFIG } from './config/state';

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

    // Cascade Lock (UI Shadow) for domain protocols
    const domainContainer = document.getElementById('domain-protocol-container');
    if (domainContainer) {
        if (active) {
            domainContainer.classList.remove('disabled-section');
        } else {
            domainContainer.classList.add('disabled-section');
        }
    }
}

function updatePhantomCascadeUI(master: boolean): void {
    const subContainer = document.getElementById('phantom-sub-container');
    if (subContainer) {
        if (master) {
            subContainer.classList.remove('disabled-section');
        } else {
            subContainer.classList.add('disabled-section');
        }
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

async function init(): Promise<void> {
    // バージョンを manifest.json から動的取得
    const manifest = chrome.runtime.getManifest();
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge) versionBadge.textContent = `v${manifest.version}`;

    // Apply i18n to elements with data-i18n attribute
    applyI18n();

    // Specific title/badge updates
    const footer = document.getElementById('footer');
    if (footer) footer.title = t('popup_footer_hint');

    const almSafetyRow = document.getElementById('alm-safety-row');
    if (almSafetyRow) almSafetyRow.title = t('popup_safety_enter_desc');

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
    const result = await chrome.storage.local.get(['global', 'phantom', 'alm']);
    const globalState = result.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
    const phantomState = result.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };

    updateUI(!!globalState.walkerMode);
    updateBlockerUI(!!globalState.blockOneTap); // デフォルト false (OFF)

    // ALM 初期状態の読み込み（マイグレーション処理）
    const rawAlm = result.alm || {};
    const almConfig: AlmConfig = {
        enabled: rawAlm.enabled ?? true,
        excludeDomains: rawAlm.excludeDomains || rawAlm.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains
    };

    updateMiniToggle('alm-master-toggle', almConfig.enabled);
    updateMiniToggle('alm-safety-toggle', !!globalState.safetyEnter);

    // プロトコル xWalker の初期状態読み込み
    updateMiniToggle('toggle-phantom-master', !!phantomState.master);
    updatePhantomCascadeUI(!!phantomState.master);

    const xWalkerConfig = phantomState.xWalker;
    if (document.getElementById('toggle-protocol-x')) {
        updateMiniToggle('toggle-protocol-x', !!xWalkerConfig.enabled);
    }
    if (document.getElementById('toggle-x-right-column')) {
        updateMiniToggle('toggle-x-right-column', !!xWalkerConfig.rightColumnDashboard);
    }

    // Dynamic Domain Button の初期化
    const domainBtn = document.getElementById('dynamic-domain-btn')!;
    let currentHostname = '';

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.url) {
            currentHostname = new URL(activeTab.url).hostname;
            // excludeDomains を参照
            const isMonitored = almConfig.excludeDomains.includes(currentHostname);
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
        const res = await chrome.storage.local.get('global');
        const globalState = res.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
        globalState.walkerMode = !globalState.walkerMode;
        await chrome.storage.local.set({ global: globalState });
        updateUI(globalState.walkerMode);
    });

    // Google One Tap ブロッカー トグル
    document.getElementById('blocker-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get('global');
        const globalState = res.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
        globalState.blockOneTap = !globalState.blockOneTap;
        await chrome.storage.local.set({ global: globalState });
        updateBlockerUI(globalState.blockOneTap);
    });

    // ALM Master トグル（マイグレーション保存）
    document.getElementById('alm-master-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get('alm');
        const raw = res.alm || {};
        const conf: AlmConfig = {
            enabled: !(raw.enabled ?? true),
            excludeDomains: raw.excludeDomains || raw.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains
        };
        const saveObj: any = { ...conf };
        delete saveObj.heavyDomains; // マイグレーション掃除
        await chrome.storage.local.set({ alm: saveObj });
        updateMiniToggle('alm-master-toggle', conf.enabled);
    });

    // Chat SafetyEnter トグル
    document.getElementById('alm-safety-toggle')!.addEventListener('click', async () => {
        const res = await chrome.storage.local.get('global');
        const globalState = res.global || { walkerMode: true, blockOneTap: false, safetyEnter: false };
        globalState.safetyEnter = !globalState.safetyEnter;
        await chrome.storage.local.set({ global: globalState });
        updateMiniToggle('alm-safety-toggle', globalState.safetyEnter);
    });

    // Phantom Mode Master トグル
    const phantomMasterToggle = document.getElementById('toggle-phantom-master');
    if (phantomMasterToggle) {
        phantomMasterToggle.addEventListener('click', async () => {
            const res = await chrome.storage.local.get('phantom');
            const phantomState = res.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
            phantomState.master = !phantomState.master;
            await chrome.storage.local.set({ phantom: phantomState });
            updateMiniToggle('toggle-phantom-master', phantomState.master);
            updatePhantomCascadeUI(phantomState.master);
        });
    }

    // X Timeline Protocol トグル
    const protocolXToggle = document.getElementById('toggle-protocol-x');
    if (protocolXToggle) {
        protocolXToggle.addEventListener('click', async () => {
            const res = await chrome.storage.local.get('phantom');
            const phantomState = res.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
            phantomState.xWalker.enabled = !phantomState.xWalker.enabled;
            await chrome.storage.local.set({ phantom: phantomState });
            updateMiniToggle('toggle-protocol-x', phantomState.xWalker.enabled);
        });
    }

    // X Right Column Dashboard トグル
    const xRightColumnToggle = document.getElementById('toggle-x-right-column');
    if (xRightColumnToggle) {
        xRightColumnToggle.addEventListener('click', async () => {
            const res = await chrome.storage.local.get('phantom');
            const phantomState = res.phantom || { master: true, xWalker: { enabled: true, rightColumnDashboard: true } };
            phantomState.xWalker.rightColumnDashboard = !phantomState.xWalker.rightColumnDashboard;
            await chrome.storage.local.set({ phantom: phantomState });
            updateMiniToggle('toggle-x-right-column', phantomState.xWalker.rightColumnDashboard);
        });
    }

    // Dynamic Domain トグルボタン（マイグレーション保存）
    domainBtn.addEventListener('click', async () => {
        if (!currentHostname) return;
        const res = await chrome.storage.local.get('alm');
        const raw = res.alm || {};
        const conf: AlmConfig = {
            enabled: raw.enabled ?? true,
            excludeDomains: raw.excludeDomains || raw.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains
        };
        const isMonitored = conf.excludeDomains.includes(currentHostname);

        if (isMonitored) {
            conf.excludeDomains = conf.excludeDomains.filter(d => d !== currentHostname);
        } else {
            conf.excludeDomains.push(currentHostname);
        }

        const saveObj: any = { ...conf };
        delete saveObj.heavyDomains; // マイグレーション掃除

        await chrome.storage.local.set({ alm: saveObj });
        updateDynamicDomainBtn(domainBtn, currentHostname, !isMonitored);
    });

    // Advanced Settings Link
    document.getElementById('advanced-settings')!.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

document.addEventListener('DOMContentLoaded', init);