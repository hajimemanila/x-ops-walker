import { GlobalState, PhantomState } from './config/state';

export interface DomainProtocol {
    /** 該当ドメインでこのプロトコルを適用するか判定 */
    matches(hostname: string): boolean;
    /** キーアクションを処理。処理済みなら true を返し、以降の伝播を止める */
    handleKey(event: KeyboardEvent, key: string, shift: boolean, container: Element): boolean;
    /** 【追加】状態の変更を検知し、自身を初期化・更新するフック（オプショナル） */
    onStateUpdate?(global: GlobalState, phantom: PhantomState): void;
    /** 【追加】違反3解消: KeyUpイベントを受け取るフック（オプショナル） */
    handleKeyUp?(event: KeyboardEvent, key: string): boolean;
    /** 【追加】違反3解消: フォーカスリセット要求を受け取るフック（オプショナル） */
    handleReset?(): void;
}

export interface MiddlewareProtocol {
    /** イベントを評価し、処理済み（伝播ブロック）なら true を返す */
    handleEvent(event: KeyboardEvent): boolean;
}

export class WalkerRouter {
    private protocols: DomainProtocol[] = [];
    private middlewares: MiddlewareProtocol[] = [];
    private baseProtocol: DomainProtocol;

    constructor(base: DomainProtocol) {
        this.baseProtocol = base;
    }

    /** ドメイン固有のプロトコルを登録 */
    register(protocol: DomainProtocol) {
        this.protocols.push(protocol);
    }

    /** ミドルウェア（汎用プロトコル）を登録 */
    registerMiddleware(mw: MiddlewareProtocol): void {
        this.middlewares.push(mw);
    }

    /** ミドルウェア層へのイベントディスパッチ */
    dispatchMiddleware(event: KeyboardEvent): boolean {
        for (const mw of this.middlewares) {
            if (mw.handleEvent(event)) {
                return true;
            }
        }
        return false;
    }

    /** Kernelから受け取った状態変更を該当プロトコルへブロードキャストする */
    notifyStateChange(global: GlobalState, phantom: PhantomState): void {
        const hostname = window.location.hostname;
        let matched = false;

        for (const protocol of this.protocols) {
            if (protocol.matches(hostname)) {
                if (protocol.onStateUpdate) {
                    protocol.onStateUpdate(global, phantom);
                }
                matched = true;
                break;
            }
        }

        // 該当する特化プロトコルがない場合はBaseProtocolへフォールバック
        if (!matched && this.baseProtocol.onStateUpdate) {
            this.baseProtocol.onStateUpdate(global, phantom);
        }
    }

    /** Kernel からディスパッチされるエントリーポイント */
    dispatch(event: KeyboardEvent, key: string, shift: boolean, container: Element): void {
        const hostname = window.location.hostname;

        // 1. 特化プロトコルの判定
        for (const protocol of this.protocols) {
            if (protocol.matches(hostname)) {
                if (protocol.handleKey(event, key, shift, container)) {
                    return; // 特化プロトコルが処理を完遂した
                }
            }
        }

        // 2. 該当がなければ Base プロトコルへフォールバック
        this.baseProtocol.handleKey(event, key, shift, container);
    }

    /** 【追加】違反3解消: KeyUpイベントのディスパッチ */
    dispatchKeyUp(event: KeyboardEvent, key: string): void {
        const hostname = window.location.hostname;
        for (const protocol of this.protocols) {
            if (protocol.matches(hostname)) {
                if (protocol.handleKeyUp && protocol.handleKeyUp(event, key)) {
                    return;
                }
            }
        }
        if (this.baseProtocol.handleKeyUp) {
            this.baseProtocol.handleKeyUp(event, key);
        }
    }

    /** 【追加】違反3解消: Resetイベントのディスパッチ */
    dispatchReset(): void {
        const hostname = window.location.hostname;
        for (const protocol of this.protocols) {
            if (protocol.matches(hostname)) {
                if (protocol.handleReset) {
                    protocol.handleReset();
                }
                return;
            }
        }
        if (this.baseProtocol.handleReset) {
            this.baseProtocol.handleReset();
        }
    }
}
