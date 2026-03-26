// src/protocols/utils/spatial-navigation.ts

// 共通のターゲット取得関数（ゴースト要素を排除する）
function getValidTargets(selector: string): Element[] {
    return Array.from(document.querySelectorAll(selector)).filter(el => {
        if (!el.isConnected) return false;
        const rect = el.getBoundingClientRect();
        // 【追加】高さや幅が0の要素（Reactの仮想スクロールのゴースト）を完全にレーダーから除外する
        return rect.height > 0 && rect.width > 0;
    });
}

export function getCurrentTarget(selector: string, focusClass = 'x-walker-focused', container?: Element): Element | null {
    const targets = getValidTargets(selector);
    if (targets.length === 0) return null;

    // 【優先度1】既にフォーカスされている要素が画面内にあれば、スクロール位置に関わらずそれを返す。
    // この判定を最上位に置くことで、window.scrollY === 0 の内部スクロール型SPA（Gemini等）でも
    // ナビゲーションがスタックするバグを防ぐ。
    const currentFocused = document.querySelector(`.${focusClass}`);
    if (currentFocused && targets.includes(currentFocused)) {
        const rect = currentFocused.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
            return currentFocused;
        }
    }

    // 【優先度2】スクロール量がほぼゼロ（ページ先頭）なら最初のターゲットを返す。
    // コンテナが渡された場合はそのscrollTopを、そうでなければwindow.scrollYを参照する。
    const scrollY = container ? container.scrollTop : window.scrollY;
    if (scrollY < 50) {
        return targets[0];
    }

    // 【優先度3】Y軸中央座標に最も近い要素を空間的に探索する（既存のフォールバック）。
    const centerY = scrollY + (window.innerHeight * 0.3);
    let minDiff = Infinity;
    let closestTarget: Element | null = null;

    for (const target of targets) {
        const rect = target.getBoundingClientRect();
        const targetCenter = scrollY + rect.top + (rect.height / 2);
        const diff = Math.abs(centerY - targetCenter);
        if (diff < minDiff) {
            minDiff = diff;
            closestTarget = target;
        }
    }

    return closestTarget;
}

export function focusNextTarget(
    selector: string,
    direction: 1 | -1,
    offset: number = 0,
    focusClass = 'x-walker-focused',
    container?: Element
): Element | null {
    const targets = getValidTargets(selector);
    if (targets.length === 0) return null;

    const currentTarget = getCurrentTarget(selector, focusClass, container);
    let currentIndex = currentTarget ? targets.indexOf(currentTarget) : -1;

    if (currentIndex === -1) {
        currentIndex = direction === 1 ? -1 : targets.length;
    }

    const nextIndex = Math.max(0, Math.min(currentIndex + direction, targets.length - 1));
    const nextTarget = targets[nextIndex];

    if (currentTarget && currentTarget !== nextTarget) {
        currentTarget.classList.remove(focusClass);
        (currentTarget as HTMLElement).style.boxShadow = '';
    }
    nextTarget.classList.add(focusClass);

    const nextRect = nextTarget.getBoundingClientRect();
    if (container) {
        // サイト内部のスクロールコンテナ（Gemini等）向け:
        // BoundingRect は viewport 相対なので、container のスクロール量に変換する
        container.scrollTo({
            top: container.scrollTop + nextRect.top - (window.innerHeight * 0.3) - offset,
            behavior: 'smooth'
        });
    } else {
        // デフォルト: window スクロール（X Timeline 等の後方互換）
        window.scrollTo({
            top: window.scrollY + nextRect.top - (window.innerHeight * 0.3) - offset,
            behavior: 'smooth'
        });
    }

    return nextTarget;
}