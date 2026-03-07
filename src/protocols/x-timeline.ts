/**
 * X Timeline Walker Protocol (v2.1.3)
 * Hybrid Architecture: setInterval (Heartbeat) + requestAnimationFrame (Smooth Sync)
 */

export interface XWalkerConfig {
    enabled: boolean;
    rightColumnDashboard: boolean;
}

let isDashboardEnabled = false;
let heartbeatId: ReturnType<typeof setInterval> | null = null;
let syncFrame: number | null = null;

export function initXWalker(config: XWalkerConfig) {
    isDashboardEnabled = config.enabled && config.rightColumnDashboard;
    console.log('[X-Ops Walker] 🐺 X Timeline Walker Protocol Status:', isDashboardEnabled);

    if (isDashboardEnabled) {
        installDashboard();
    } else {
        removeDashboard();
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'xWalker' in changes) {
        const newConfig = changes.xWalker.newValue as XWalkerConfig;
        isDashboardEnabled = newConfig.enabled && newConfig.rightColumnDashboard;
        if (isDashboardEnabled) {
            installDashboard();
        } else {
            removeDashboard();
        }
    }
});

function installDashboard() {
    // 0. 重複起動を防ぐための完全クリーンアップ
    removeDashboard();

    // 1. Heartbeat (setInterval): 500msごとにDOMの生存を確認し、必要なら蘇生させる
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);

    // 2. Smooth Sync (requestAnimationFrame): 描画フレーム同期
    // Chromeにおけるトグル直後のレイアウト計算遅延を回避するための微小猶予を与えてから開始
    setTimeout(() => {
        if (isDashboardEnabled) startSync();
    }, 50);
}

function removeDashboard() {
    if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeatId = null;
    }
    if (syncFrame) {
        cancelAnimationFrame(syncFrame);
        syncFrame = null;
    }
    const spacer = document.getElementById('x-ops-dashboard-spacer');
    if (spacer) spacer.remove();

    const box = document.getElementById('x-ops-dashboard-box');
    if (box) box.remove();
}

// ── 🛡️ Heartbeat: Reactの破壊から逃げ切り、安定した親を探す ──
function maintainDOM() {
    if (!isDashboardEnabled) return;

    // 1. 除外URL/モーダルフィルター (TM版ロジック準拠)
    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith('/settings') || path.includes('/i/flow/login') || path === '/login' || path === '/logout' || path.startsWith('/i/display');

    if (isLoginModal || isExcluded) {
        const box = document.getElementById('x-ops-dashboard-box');
        if (box) box.style.display = 'none';
        return;
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    // サイドバーが見つからない場合は、このサイクルは終了（Heartbeatが次のチャンスを待つ）
    if (!sidebar) return;

    // Spacerの確保
    let spacer = document.getElementById('x-ops-dashboard-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'x-ops-dashboard-spacer';
        spacer.style.width = '100%';
        spacer.style.height = '150px';
        spacer.style.marginTop = '12px';
        spacer.style.marginBottom = '12px';
        spacer.style.opacity = '0';
        spacer.style.pointerEvents = 'none';
    }

    // 2. Smart Pillar: 兄弟要素の出現でコンテナ境界を検知（自身を除外）
    const searchBar = sidebar.querySelector('[role="search"]');

    if (spacer && searchBar) {
        let target = searchBar as Element;
        let depth = 0;

        // 検索窓から上に辿り、兄弟要素（トレンドやおすすめユーザー等）を持つ大枠コンテナを見つける
        while (target.parentElement && depth < 10) {
            // 自分自身(spacer)を除外して兄弟要素を数える（無限ループと自作自演防止の要）
            const siblings = Array.from(target.parentElement.children).filter(el => el.id !== 'x-ops-dashboard-spacer');

            if (siblings.length > 1) {
                break; // ここが「検索ブロック」と「他のブロック」の境界線
            }
            target = target.parentElement as Element;
            depth++;
        }

        // 見つけた検索ブロックの直後(after)に「見えない柱」を立て、後続コンテンツを押し下げる
        if (target && target.parentElement && target.nextSibling !== spacer) {
            target.after(spacer);
            console.log('[X-Ops Walker] Dashboard spacer secured via Smart Pillar (depth:', depth, ')');
        }
    } else if (spacer && !spacer.isConnected) {
        // 検索窓がない場合のフォールバック（一番上）
        const wrapper = sidebar.firstElementChild || sidebar;
        if (wrapper.firstChild !== spacer) {
            wrapper.insertBefore(spacer, wrapper.firstChild);
        }
    }

    // Box(UI)の維持
    let box = document.getElementById('x-ops-dashboard-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'x-ops-dashboard-box';

        // Glassmorphism デザイン
        Object.assign(box.style, {
            position: 'fixed',
            zIndex: '9999',
            background: 'rgba(10, 10, 22, 0.75)',
            backdropFilter: 'blur(16px) saturate(180%)',
            webkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 140, 0, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            display: 'none', // 初期は隠し、sync() で位置確定後に表示する
            opacity: '1' // opacity 0 で残らないようにリセット
        });

        const titleText = chrome.i18n.getMessage('x_dashboard_title') || 'PHANTOM OPS DASHBOARD';
        const statusText = chrome.i18n.getMessage('x_dashboard_status_ready') || 'SYSTEM READY';

        box.innerHTML = `
            <div style="padding: 10px 14px; background: rgba(255, 140, 0, 0.1); border-bottom: 1px solid rgba(255, 140, 0, 0.2);">
                <span style="font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase;">${titleText}</span>
            </div>
            <div style="padding: 20px; text-align: center;">
                <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
            </div>
        `;
        document.body.appendChild(box);
    }
}

// ── 📐 Smooth Sync: requestAnimationFrame による滑らかな座標追従 ──
function startSync() {
    function sync() {
        if (!isDashboardEnabled) return;

        // 除外URL/モーダルフィルター (syncループ内でもチェックし、表示を即座に消す)
        const path = window.location.pathname;
        const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
        const isExcluded = path.startsWith('/settings') || path.includes('/i/flow/login') || path === '/login' || path === '/logout' || path.startsWith('/i/display');

        const box = document.getElementById('x-ops-dashboard-box');
        if (isLoginModal || isExcluded) {
            if (box) box.style.display = 'none';
            syncFrame = requestAnimationFrame(sync);
            return;
        }

        const spacer = document.getElementById('x-ops-dashboard-spacer');
        const sidebar = document.querySelector('[data-testid="sidebarColumn"]');

        if (spacer && box && sidebar && spacer.isConnected) {
            const isSidebarVisible = window.getComputedStyle(sidebar).display !== 'none';
            const spacerRect = spacer.getBoundingClientRect();

            // Chromeの初回計算遅延（width: 0）を許容しつつ、表示を確定させる
            if (isSidebarVisible && spacerRect.width > 0) {
                box.style.display = 'block';
                const boxHeight = box.offsetHeight;

                spacer.style.height = (boxHeight + 10) + 'px';
                box.style.width = spacerRect.width + 'px';
                box.style.left = spacerRect.left + 'px';

                // 究極の解決策: UIの縦位置は検索窓の物理座標(bottom)にロックする
                const searchBar = sidebar.querySelector('[role="search"]');
                if (searchBar) {
                    const searchRect = searchBar.getBoundingClientRect();
                    box.style.top = (searchRect.bottom + 12) + 'px';
                } else {
                    box.style.top = Math.max(spacerRect.top, 53) + 'px';
                }
            } else if (!isSidebarVisible) {
                // サイドバー自体が非表示（display: none）の場合のみ box を隠す
                // spacer.width が 0 なだけの時は、レイアウト計算待ちの可能性があるため
                // box.style.display = 'none' を急がない（チラつき防止）
                box.style.display = 'none';
            }
        } else if (box) {
            box.style.display = 'none';
        }

        syncFrame = requestAnimationFrame(sync);
    }
    syncFrame = requestAnimationFrame(sync);
}
