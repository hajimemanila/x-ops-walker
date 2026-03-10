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

export function getCurrentTarget(selector: string, focusClass = 'x-walker-focused'): Element | null {
    const targets = getValidTargets(selector);
    if (targets.length === 0) return null;

    if (window.scrollY < 50 && targets.length > 0) {
        return targets[0];
    }

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
    const targets = getValidTargets(selector);
    if (targets.length === 0) return null;

    const currentTarget = getCurrentTarget(selector, focusClass);
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
    window.scrollTo({
        top: window.scrollY + nextRect.top - (window.innerHeight * 0.3) - offset,
        behavior: 'smooth'
    });

    return nextTarget;
}