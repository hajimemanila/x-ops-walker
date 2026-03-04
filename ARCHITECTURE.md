# X-Ops Walker: Architecture & Contributor Guide (v1.2.0)

このドキュメントは、X-Ops Walker の中核となるアーキテクチャ、DOM干渉の哲学、および新しいドメイン（サイト固有の挙動）を追加する際のルールを解説します。コントリビュータは、コードを追加したりIssueを立てたりする前に必ず本ドキュメントを一読してください。私たちは堅牢性とセキュリティを妥協なく追求する環境を構築しています。

---

## 1. 思想：Gatekeeper と Protocol の分離
X-Ops Walker (v1.2.0以降) は、単一の巨大なスクリプトではなく、明確に責務が分かれた3層構造を採用しています。特定のWebサイトのDOMに直接依存したダーティなハックが、他のタブやブラウザ全体の安定性を損なうことを防ぐためです。

- **Kernel (Gatekeeper)**: 絶対的防壁。ブラウザネイティブのイベントを最上流で奪い、安全か（入力欄ではないか等のXray-safe判定）を確認し、最適なスクロールコンテナを特定します。この層は**DOMの物理的状態**のみに関心を持ちます。
- **Router (Dispatcher)**: 現在のURLを見て、どの Protocol に処理を任せるかを決める交通整理役です。
- **Protocols (Actions)**: 「Wを押したらスクロールする」「特定のサイトでZを押したら一番下に移動する」といった、具体的な振る舞いの定義（ロジック層）です。

---

## 2. ディレクトリ構造と各ファイルの役割

```plaintext
src/
 ├── content/
 │    ├── kernel.ts          # 【コア】防壁・探知エンジン・UIフック
 │    ├── router.ts          # 【ルーター】URLベースのプロトコル切り替え
 │    └── protocols/         # 【振る舞い】サイトごとの個別ロジック
 │         ├── base.ts       # デフォルトの汎用アクション (W/S/A/D/Z等)
 │         ├── ai-chat.ts    # AIチャット専用 (Gemini, ChatGPT等) の最適化
 │         └── (将来の追加ドメイン: x-timeline.ts 等)
```

### 🛡️ [kernel.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts) (The Gatekeeper)
ブラウザのEvent Captureフェーズの最上流（`window.addEventListener(..., {capture: true})`）に常駐し、SPAの独自リスナーよりも**先**にキーボードイベントを捕捉します。

#### 重要な関数と採用ロジックの背景（Why & What）:
- **[isOrphan()](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#100-115)**: 
  - **Why**: 拡張機能のアップデート時やリロード時に、古い注入済みスクリプト（亡霊）と新しいスクリプトが同一タブ内で競合し、二重実行されるのを防ぐため。
  - **What**: イベントリスナーの先頭で強制的に `chrome.runtime.getManifest()` を呼び出し、例外（Extension context invalidated）が発生した場合は即座に自身を抹消し、以降の実行を無効化します。
- **[shouldPassThrough(event)](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#307-336)**: 絶対的パススルー層。
  - **Why**: コピー（Ctrl+C）やIMEの日本語変換中など、OSやブラウザが当然処理すべきユーザーのアクションをWalkerが妨害してしまう最悪のUXを避けるため。
  - **What**: 「IME入力の特定コード（Chromeの Process、Firefoxの 229）」「テキスト選択中」「修飾キーのみの押下」などを網羅的にチェックし、合致すれば即座に干渉を止めます。
- **[isInputActive(event)](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#282-306)**: 
  - **Why**: Firefox特有の「Xray Wrappers」というセキュリティ境界が存在し、`instanceof Element` などの型チェックはコンテキスト違いで false になるため。
  - **What**: 拡張機能の安全領域からページのDOMに触れる際、純粋なDOMプロパティである `node.nodeType === 1` などの判定法を用いたXray-safeな入力欄ハイジャック判定です。（絶対に型チェックに戻してはいけません）。
- **[getBestScrollContainer(event)](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#78-99)**: ハイブリッド・スクロール探知エンジン。
  - **① Event Path探索 (composedPath)**: RedditなどのShadow DOM内で発生したイベントから、直近の親コンテナを一発で特定する。
  - **② Active Element探索 (getScrollParentPiercing)**: Geminiのように「固定フッター（入力欄）」の兄弟要素にスクロールがある場合、フォーカス位置から上へ遡る。
  - **③ Center Raycast探索 (elementFromPoint)**: 画面中央からの逆探知・Shadow Boundaryを貫通してスクロール親を見つけ出す最終兵器。
- **[normalizeKey(event)](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#667-675)**: 
  - **Why**: ユーザーのキーボードレイアウト（US/JIS等）やOSによって `event.key` の出力がブレるため。
  - **What**: 物理的な配置を優先する `event.code` をベースにパースし、修飾キー（Shift等）に依存しない常に小文字の確実な文字列表現（例: `'a'`, `'w'`, `' '`）を生成します。
- **【特権】`Alt+Z` (緊急フォーカス奪還コマンド)**: 
  - **Why**: 複雑なSPA（閉じたShadow DOM内や見えない入力フィールド）において、フォーカスが抜け出せなくなり、Walkerの操作が完全に麻痺する「詰み」状態を打破するため。
  - **What**: リスナーの最上段（[shouldPassThrough](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#307-336) やルーター委譲より**前**）に位置し、強制的に [deepBlur](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#645-660) と `document.body.focus()` を呼び出します。これにより「無主フォーカス」を消滅させ、確実に操作主体をWalkerに取り戻します。

### 🔀 [router.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/router.ts) (The Dispatcher)
[DomainProtocol](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/router.ts#1-7) インターフェースを定義し、Chain of Responsibility（責任の連鎖）パターンでキーボードイベントを処理します。マッチする特化プロトコルが処理を完遂（`true`を返却）すればそこで終了し、未処理（`false`）であれば [base.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/protocols/base.ts) へフォールバックします。

### 📜 [protocols/base.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/protocols/base.ts) (Universal Actions)
汎用的なウェブサイトで動作するデフォルトのキーバインド群です。UIのトグル（Fキー等）はハードコードせず、`CustomEvent` を `window` にディスパッチし、[kernel.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts) 側で拾わせる疎結合（Event-Driven）設計を採用しています。

---

## 3. 現在のキーバインド一覧 (Base Protocol)

以下は、いかなる特化プロトコルにも該当しない場合（[base.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/protocols/base.ts)）のデフォルトマッピングです。

| キー | （単押し）アクション | Shift + キー（修飾あり） アクション |
| :--- | :--- | :--- |
| **W** | スクロールアップ (画面の約80%) | ページの**最上部**へスクロール |
| **S** | スクロールダウン (画面の約80%) | ページの**最下部**へスクロール |
| **A** | **前のタブ**へ移動 | （なし） |
| **D** | **次のタブ**へ移動 | （なし） |
| **Space** | **次のタブ**へ移動 | **前のタブ**へ移動 |
| **Q** | 履歴 **戻る** (Back) | （なし） |
| **E** | 履歴 **進む** (Forward) | （なし） |
| **Z** | DOMフォーカスリセット & **最上部**へスクロール | 閉じたタブを開く (Undo Close) |
| **Alt + Z** | 【特権コマンド】緊急フォーカス奪還 & 最上部へ | - |
| **F** | チートシート（HUD）の表示/非表示トグル | （なし） |
| **X** | （なし） | 現在のタブを**閉じる** |
| **R** | （なし） | 現在のタブを**リロード** |
| **M** | （なし） | 現在のタブを**ミュート/解除** |
| **G** | （なし） | **他のタブを破棄**（メモリ解放: Discard Other） |
| **T** | （なし） | 全てのタブを**クリーンアップ**（ピン留め・再生中除く）|
| **9** | （なし） | **最初のタブ**（左端）へ移動 |
| **C** | （なし） | 現在のタブを**複製**（Duplicate） |
| **Esc** | Walker モードの **ON/OFF** トグル（※[kernel.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts)処理） | - |

*(※注: [ai-chat.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/protocols/ai-chat.ts) が適用されるようなドメインでは、「Zキーを押すとページ最下部へ移動する」といったプロトコルによるオーバーライドが存在します)*

---

## 4. 拡張ルール：新しいドメインプロトコルを追加するには

X.com や YouTube など、特定のサイト専用の特殊な操作（Domain Protocols）を追加する場合は、以下の厳格なルールに従ってください。

### ❌ 絶対にやってはいけないこと (DON'Ts)
- **[kernel.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts) を汚染しない**: 特定のURL（ホスト名）に依存する分岐を [kernel.ts](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts) 内に絶対に書いてはいけません。
- **`addEventListener` を自前で書かない**: プロトコル内で独自に [keydown](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#677-757) などをリッスンしないでください。入力欄ハイジャックなどのバグが再発します。
- **DOMのセキュリティ判定を再発明しない**: [isInputActive](file:///c:/Users/Predator/Desktop/FoxWalkerExt/src/kernel.ts#282-306) のようなチェックはプロトコル内で行う必要はありません。ルーターから渡された時点で、それはすでに「安全なキー操作」であることが Kernel によって保証されています。

### ⭕ 正しい追加手順 (DOs)
1. `src/protocols/` ディレクトリに新しいファイル（例: `x-timeline.ts`）を作成します。
2. `DomainProtocol` インターフェースを実装するクラスを作成します。
```typescript
import { DomainProtocol } from '../router';

export class XTimelineProtocol implements DomainProtocol {
    matches(hostname: string): boolean {
        // マッチさせたい正規表現や文字列検索
        return hostname === 'x.com' || hostname === 'twitter.com';
    }

    handleKey(event: KeyboardEvent, key: string, shift: boolean, container: Element): boolean {
        if (key === 'j') {
            // 次のツイートへ移動する独自のDOMロジック
            return true; // 処理を完遂した場合は必ず true を返す
        }
        // W や S など、自分が関知しないキーは false を返し、BaseProtocol にフォールバックさせる
        return false; 
    }
}
```
3. 作成したプロトコルを `kernel.ts` の上位でルーターに登録（`router.register(new XTimelineProtocol())`）します。
4. UIの変更が必要な場合は、プロトコル内で直接 DOM を生成するのではなく、`CustomEvent` を発行して Kernel 層や UI コンポーネント層に処理を依頼してください。

---

## 5. 汎用設定（General Settings）拡張のガイドライン

今後プロジェクトに、特定の1つのサイトではなく、「複数のサイト」または「全サイト」にまたがって動作するような機能フラグ（例：「SafetyEnter設定」「動画倍速汎用化」など）を追加する場合のルールです。

1. **Kernelフラグの乱用禁止**:
   `kernel.ts` はあくまでイベントの「門番」です。「設定AがOnならこうする」といった特定のフィーチャーフラグを `kernel.ts` の上位層に書き込まないでください。
2. **「Middleware（ミドルウェア）プロトコル」としての実装**:
   もし「特定の数サイト」または「すべてのサイト」に介入する機能であれば、新たにミドルウェアとして動作する `Protocol` を作成してください（例: `src/protocols/safety-enter.ts`）。
3. **ルーターの連鎖 (Chain) を活用する**:
   ミドルウェアプロトコルは、`matches` で広範囲に `true` を返させます。その後 `router.ts` にて、**ほかのドメイン特化プロトコルよりも前**（あるいは意図する優先順位）に登録します。
   - もしそのミドルウェアがキーアクションを捕捉して処理（条件付きブロックなど）した場合は `true` を返し、伝播を止めます。
   - 処理しなかったキーについては `false` を返し、次のプロトコル（AI Chatなど）やBaseへ流します。

これにより、一切 `kernel.ts` を汚すことなく、強力な汎用機能を全ドメインに安全にデプロイし、トグル可能にすることができます。プラグインのように扱ってください。
