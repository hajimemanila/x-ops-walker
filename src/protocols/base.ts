import { DomainProtocol } from '../router';

export class BaseProtocol implements DomainProtocol {
    matches(hostname: string): boolean {
        // Base Protocol（フォールバック）として機能するため常に true
        return true;
    }

    handleKey(event: KeyboardEvent, key: string, shift: boolean, container: Element): boolean {
        // ── Shiftキーありのアクション ──
        if (shift) {
            switch (key) {
                // タブ・ウィンドウ操作（backgroundへ委譲）
                case 'x':
                    chrome.runtime.sendMessage({ command: 'CLOSE_TAB' });
                    return true;
                case 'z':
                    chrome.runtime.sendMessage({ command: 'UNDO_CLOSE' });
                    return true;
                case 'r':
                    chrome.runtime.sendMessage({ command: 'RELOAD_TAB' });
                    return true;
                case 'm':
                    chrome.runtime.sendMessage({ command: 'MUTE_TAB' });
                    return true;
                case 'g':
                    chrome.runtime.sendMessage({ command: 'DISCARD_TAB' });
                    return true;
                case 't':
                    chrome.runtime.sendMessage({ command: 'CLEAN_UP' });
                    return true;
                case '9':
                    chrome.runtime.sendMessage({ command: 'GO_FIRST_TAB' });
                    return true;
                case 'c':
                    chrome.runtime.sendMessage({ command: 'DUPLICATE_TAB' });
                    return true;

                // スクロール操作 (ページ先頭・末尾へ直行)
                case 'w':
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                    return true;
                case 's':
                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                    return true;

                // ナビゲーション (Shift + Space: 前タブ)
                case ' ':
                    chrome.runtime.sendMessage({ command: 'PREV_TAB' });
                    return true;
            }
            return false;
        }

        // ── 修飾キーなしのアクション ──
        switch (key) {
            // スクロール操作 (画面の80%分)
            case 'w':
                container.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
                return true;
            case 's':
                container.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                return true;

            // ナビゲーション (タブ移動)
            case 'a':
                chrome.runtime.sendMessage({ command: 'PREV_TAB' });
                return true;
            case 'd':
                chrome.runtime.sendMessage({ command: 'NEXT_TAB' });
                return true;
            case ' ':
                chrome.runtime.sendMessage({ command: 'NEXT_TAB' }); // 単押しSpace: 次タブ
                return true;

            // 履歴ナビゲーション
            case 'q':
                window.history.back();
                return true;
            case 'e':
                window.history.forward();
                return true;

            // ピン留め等 (元コードではFはチートシートでしたが、プロトコル分離で参照不可のため代替実装)
            case 'f':
                // kernel.ts 側に定義された既存のUIをトグルするため、カスタムイベントを発火させる
                window.dispatchEvent(new CustomEvent('XOpsWalker_ToggleCheatsheet'));
                return true;

            // フォーカス・スクロールのリセット (Z単押し)
            case 'z':
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
                window.focus();
                container.scrollTo({ top: 0, behavior: 'smooth' });
                return true;
        }

        // ── Alt + Z (緊急フォーカス奪還) ──
        // KernelのAlt+Z最上段ブロックからディスパッチされた場合の処理
        if (event.altKey && key === 'z') {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            window.focus();
            container.scrollTo({ top: 0, behavior: 'smooth' });
            return true;
        }

        return false; // Baseプロトコルでも該当アクションがなければ false
    }
}
