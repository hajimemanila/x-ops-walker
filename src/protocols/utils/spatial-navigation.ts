// src/protocols/utils/spatial-navigation.ts

export function getCurrentTarget(selector: string, focusClass = 'x-walker-focused'): Element | null {
    const targets = Array.from(document.querySelectorAll(selector)).filter(el => el.isConnected);
    if (targets.length === 0) return null;

    // 【復元】ページ最上部付近では無条件で先頭要素をロックオン（通知ページ等でのズレ防止）
    if (window.scrollY < 50 && targets.length > 0) {
        return targets[0];
    }

    // 【復元】現在のフォーカス維持判定（ブックマークページ等での消失防止）
    // マジックナンバーを使わず、純粋な交差判定（画面に少しでも入っていれば維持）で解決
    const currentFocused = document.querySelector(`.${focusClass}`);
    if (currentFocused && targets.includes(currentFocused)) {
        const rect = currentFocused.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
            return currentFocused;
        }
    }

    const centerY = window.scrollY + (window.innerHeight * 0.3);
    let minDiff = Infinity;
    let closestTarget: Element | null = null;

    for (const target of targets) {
        const rect = target.getBoundingClientRect();
        const targetCenter = window.scrollY + rect.top + (rect.height / 2);
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
    focusClass = 'x-walker-focused'
): Element | null {
    const targets = Array.from(document.querySelectorAll(selector)).filter(el => el.isConnected);
    if (targets.length === 0) return null;

    const currentTarget = getCurrentTarget(selector, focusClass);
    let currentIndex = currentTarget ? targets.indexOf(currentTarget) : -1;

    if (currentIndex === -1) {
        currentIndex = direction === 1 ? -1 : targets.length;
    }

    const nextIndex = Math.max(0, Math.min(currentIndex + direction, targets.length - 1));
    const nextTarget = targets[nextIndex];

    // 【復元】フォーカス剥奪時にインラインスタイルの boxShadow を確実にクリアする
    if (currentTarget && currentTarget !== nextTarget) {
        currentTarget.classList.remove(focusClass);
        (currentTarget as HTMLElement).style.boxShadow = '';
    }
    nextTarget.classList.add(focusClass);

    const nextRect = nextTarget.getBoundingClientRect();
    window.scrollTo({
        top: window.scrollY + nextRect.top - (window.innerHeight * 0.3) - offset,
        behavior: 'smooth'
    });

    return nextTarget;
}