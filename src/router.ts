export interface DomainProtocol {
    /** 該当ドメインでこのプロトコルを適用するか判定 */
    matches(hostname: string): boolean;
    /** キーアクションを処理。処理済みなら true を返し、以降の伝播を止める */
    handleKey(event: KeyboardEvent, key: string, shift: boolean, container: Element): boolean;
}

export class WalkerRouter {
    private protocols: DomainProtocol[] = [];
    private baseProtocol: DomainProtocol;

    constructor(base: DomainProtocol) {
        this.baseProtocol = base;
    }

    /** ドメイン固有のプロトコルを登録 */
    register(protocol: DomainProtocol) {
        this.protocols.push(protocol);
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
}
