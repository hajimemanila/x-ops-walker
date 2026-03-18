# X-Ops Walker: Architecture & Contributor Guide (v2.2.8)

このドキュメントは、X-Ops Walkerの中核となるアーキテクチャ、DOM干渉の哲学、および新しいドメイン（サイト固有の挙動）やミドルウェアを追加する際のルールを解説します。コントリビュータ（およびAIエージェントによるコード生成時）は、コードを追加したりIssueを立てたりする前に必ず本ドキュメントを一読してください。私たちは堅牢性とセキュリティを妥協なく追求する環境を構築しています。

---

## 1. プロジェクトのフェーズとロードマップ (Roadmap)

当プロジェクトは v1 系（システム基盤・Universal 機能の完成）を終え、いよいよ v2 系（ドメイン特化型プロトコル・Domain-Specific Protocols の実装と状態管理の集権化）フェーズへ突入しています。

v2 系の最大の目標は「ドメイン特化型知能（Domain-Specific Protocols）の統合」「JIT空間ナビゲーションによるステートレス化」および「OSレベル自動化（AHK）との責務の完全分離」です。

- **v2.0.0**: Context-Aware UI の実装（ポップアップのドメイン適応化） ※完了済
    
- **v2.1.x**: X Timeline Walker の実装、ALMのホワイトリスト化、不要なAHKスタブのパージ ※完了済
    
- **v2.2.x**: JIT空間ナビゲーション基盤の確立、Phantom/ALM Stateの一元管理化（`config/state.ts`への集約）、Options.htmlへの設定集約 ※完了済
    
- **v2.2.6**: ルーター・パイプラインの再構築（Middleware層の正式導入、Protocolの完全無菌化、ライフサイクルフックの確立） ※完了済

- **v2.2.8**: Firefox Multi-Account Containers環境におけるデータ隔離境界の再定義（`localStorage` の戦略的許容） ※完了済

- **v2.3.x**: Gemini Walker等の新規プロトコル実装

- **Future**: AHKによる自立したタブ自動巡回・フォーカス奪取システムの外部確立（拡張機能との連携）
    

---

## 2. v2系の基本方針（Architecture Principles for v2）

v2 系の開発において、以下の4つの機能設計原則を厳守します。

- **Stateless DOM-Driven (JITナビゲーションの徹底)**: 拡張機能のメモリ上にフォーカス位置（`currentIndex` 等）を保持してはならない。手動スクロールとの競合による致命的な誤爆を防ぐため、操作の「その瞬間」におけるDOMの空間座標を唯一の真実（Single Source of Truth）として扱い、動的にターゲットを算出する。
    
- **ルーター・パターンの徹底 (Isolation)**: `kernel.ts` は「交通整理（ルーター）」と「Universal機能（Focus Shield等）」の実行に専念する。特定のURLに依存するDOM操作やロジックは絶対に `kernel.ts` に混入させず、必ず `src/protocols/` ディレクトリ配下へ委譲・隔離する。状態（State）の変化もルーター経由で各プロトコルへ伝達される。
    
- **Context-Aware UI (文脈適応型ポップアップ)**: `popup.html` および `popup.ts` は、現在アクティブなタブのURLを検知し、そのドメインに関連する設定項目だけを動的に表示する。詳細な設定・管理機能（休眠保護ドメインのCRUD等）は `options.html` へ分離する。
    
- **Storage の区画整理と階層化 (State Centralization) と隔離境界 (Isolation Boundary)**: `chrome.storage.local` のデータ構造はドメイン・機能ごとに明確に階層化して分離し、その型定義とデフォルト値はすべて `src/config/state.ts` に一極集中（Centralize）させる。プロトコル内に設定値（色やオフセット等）を直接ハードコードすることは許されない。
  **【例外規定：コンテナ隔離】** 拡張機能全体で共有すべきシステム設定は `chrome.storage.local` を使用するが、**アカウントごとに完全に隔離すべきドメイン固有のユーザー操作データ（例：X.comにおける個別のブックマーク位置や既読マーカー等）については、Firefoxのコンテナ（Multi-Account Containers）間のデータ汚染・共有を防ぐため、意図的にブラウザネイティブの `window.localStorage` を使用することをアーキテクチャの公式な掟として許可・推奨する。**
    

---

## 3. 思想：Gatekeeper, Router, Protocol, Middleware の分離

X-Ops Walker は、明確に責務が分かれた構造を採用しています。特定のWebサイトのDOMに直接依存したハックが、ブラウザ全体の安定性を損なうことを防ぐためです。

- **Kernel (Gatekeeper)**: 絶対的防壁。ブラウザネイティブのイベント（`keydown`, `keyup` 等）を最上流で一括して奪い、安全か（入力欄ではないか）を確認します。また、タブ復帰時にSPAが放つ遅延オートフォーカスを撃墜する「Active Focus Shield」を展開します。
    
- **Router (Dispatcher)**: `kernel.ts` からイベントや状態変更の通知を受け取り、それを「ミドルウェア」や、現在のURLに合致する「プロトコル」へ正確に伝播させるパイプラインの管理者（交通整理役）です。
    
- **Middleware (Shields / Filters)**: 全ドメイン共通でイベントを評価・遮断する層です。Routerの連鎖の最上流でフックされ、条件に合致した場合（例：SafetyEnter発動時）は、以降のプロトコルへのイベント伝播を完全に遮断します。
    
- **Radar (Spatial Navigation)**: 画面の物理座標（Y軸等）から、次に操作すべきターゲット要素を割り出す「汎用レーダー」。ドメインの仕様（XやGeminiなど）を一切知らず、DOMの矩形計算のみを責務とします。
    
- **Protocols (Weapons / Actions)**: ルーターから命令と設定（Config）を受け取り、レーダーがロックオンした要素に対して特定のサイト固有の振る舞い（いいね、リポスト等）を実行するロジック層です。
    

---

## 4. 次世代タブライフサイクル管理 (ALM / Smart Tab Discard)

拡張機能はタブのメモリライフサイクルを完全に掌握するためのアプローチ（Adaptive Lifecycle Management - ALM）を確立しています。

### 4.1. コア機能の名称と定義

- **Execution Dormancy**: ブラウザが不要と判断して勝手に行う「プロセス凍結」。拡張機能のJSが発火しなくなる「敵」です。
    
- **Smart Tab Discard**: 当機能が自らの意思とタイマーによって意図的に行う「メモリ解放（`chrome.tabs.discard`）」。我々が支配する休眠です。
    
- **Vital Heartbeat (Veto)**: 入力中やメディア再生中等に発する「絶対生存信号」。これにより Smart Tab Discard が Veto（拒否）されます。
    
- **Exclude Domains (保護リスト)**: ユーザーが明示的に指定した「絶対にSmart Tab Discardの対象にしない」ドメインのリスト（旧称 `heavyDomains` は技術的負債としてパージされ、`excludeDomains` に完全統一済）。
    

### 4.2. Background-Driven アーキテクチャとシングルトン・タイマー

現在は完全に Background スクリプト主導の中央集権型で稼働しています。

Backgroundに「1分間隔のマスタータイマー」を1本だけ置き、全タブの `inactiveAt` を走査して一括処理します。猶予期間（Grace Period）は基本8分、タブ数が30枚を超える場合は動的に5分へ短縮されます。

### 4.3. 永続化レイヤーと Service Worker の Keep-Alive

- **`walker-keepalive` Port**: Content Scriptから Background へ常時接続のポートを開くことで、Service Worker の意図しない休止を OS レベルで阻止しています。
    
- **State Storage**: 状態遷移の末尾で即座に `chrome.storage.local` へコミットし、SW再起動時に記憶を復元します。
    

### 4.4. OSレベル自動化 (AHK) との責務の完全分離

タブがバックグラウンドに長時間置かれた際、Chromeはセキュリティ機構として「User Activation（ユーザー操作証明）」を剥奪し、キーボードイベントを遮断する「幽霊フォーカス状態」を作り出します。

これはJSレイヤーから突破不可能な壁であるため、責務を以下のように完全に分離します。

- **拡張機能（JS）の責務**: DOMの奥底を正確に読み取り、コンテキストに合わせた繊細な制御（Focus ShieldによるSPA妨害排除、スクロール、Veto発信）を行う。
    
- **AHK（OSレベル）の責務**: 拡張機能のロード状態を完全に無視し、ユーザーの物理的な意思を0コンマ秒の遅れもなくシステムに叩き込む。User Activation喪失時には「安全地帯への物理クリック（または右クリック＆Esc）」を注入し、OSレベルの入力ストリームを強制開通させる。
    

このため、拡張機能内にAHK向けのシグナル送信ロジック（`ahkInfection`等）を混入させることは固く禁じます。

---

## 5. システム構成図 (Mermaid)

```mermaid
graph TD
    Config[src/config/state.ts<br>Single Source of Truth] -.->|Types & Defaults| StorageArea
    Config -.->|Imports| UI
    Config -.->|Imports| BackgroundSW

    UI[Popup UI / Options] <-->|chrome.storage.local| Storage[(Persistent Storage)]
    
    subgraph StorageArea [Storage Area]
        S_Global[{global}]
        S_Phantom[{phantom Protocols}]
        S_Alm[{alm Config & alm_tab_states}]
    end
    Storage -.-> S_Global & S_Phantom & S_Alm
    
    subgraph BackgroundSW [Background Service Worker]
        BG_Alm[ALM Manager] <--> S_Alm
        BG_Timer((chrome.alarms: 1min Tick)) --> BG_Alm
        TabEvents((tabs.onActivated / onUpdated)) --> BG_Alm
    end
    
    subgraph Kernel [Content Script: kernel.ts]
        Shield[Active Focus Shield]
        Router[WalkerRouter]
        
        Events((DOM Events)) --> Shield --> Router
        StateSync((Storage Change)) --> Router
        
        Router -->|1. dispatchMiddleware| Middleware[Middleware Layer]
        Middleware -->|Pass| Protocols[Domain Protocols]
        Router -->|2. dispatchEvent / notifyStateChange| Protocols
        
        Protocols -->|Heartbeat / Veto| BG_Alm
    end
    
    subgraph ExtOS [External OS Automation: AutoHotkey]
        AHK[AHK Agent: Auto-Cycle / Fast Tab Switch]
        AHK -.->|Physical Click / Alt+Z| Events
    end
    
    BG_Alm -->|tabs.discard| Kernel
```  

## 6. ディレクトリ構造と各ファイルの役割

Plaintext

```
src/
 ├── config/
 │   └── state.ts           # 【真実の源泉】全インターフェースとデフォルト定数の一元管理
 ├── content/
 │   ├── kernel.ts          # 【コア】防壁エンジン(Focus Shield)・イベント強奪
 │   ├── router.ts          # 【ルーター】Middlewareの管理、URLベースのプロトコル切り替えとライフサイクル管理
 │   └── protocols/         # 【振る舞い】サイトごとの個別ロジックおよびミドルウェア
 │       ├── utils/
 │       │   └── spatial-navigation.ts # 【共通基盤】JIT空間ナビゲーション（汎用レーダー）
 │       ├── base.ts        # デフォルトの汎用アクション
 │       ├── safety-enter.ts# 【Middleware】Chat SafetyEnter (汎用ミドルウェア)
 │       ├── x-timeline.ts  # 【ドメイン特化】X Timeline Walker (v2.1+)
 │       ├── gemini-walker.ts # 【ドメイン特化】Gemini Walker (v2.2+)
 │       └── ai-chat.ts     # AIチャット専用の最適化
 ├── background.ts          # 【中枢】状態管理・ALM・Smart Tab Discard監視
 ├── popup.ts               # 【UI】Context-Aware コントロール
 └── options.ts             # 【UI】詳細設定・Phantom State/ALMリスト一元管理
```

### 🛡️ kernel.ts (The Gatekeeper)

ブラウザのEvent Captureフェーズの最上流に常駐し、SPAの独自リスナーよりも**先**にキーボードイベント（keydown, keyup等）およびカスタムリセットイベントを捕捉します。

- **Active Focus Shield**: タブ復帰時、最大1.5秒間キャプチャフェーズで `focusin` を監視し、SPAによる不法な遅延オートフォーカスを撃墜（`blur`）して `body` へ引き戻す。ユーザーの物理操作（`mousedown`, `keydown`）を検知した瞬間に自壊（エスケープ）し、UXを保護する。
    
- **isInputActive(event)**: Firefoxの Xray Wrappers を貫通するため、`instanceof Element` を避け、純粋なDOMプロパティ（`nodeType === 1`）を用いたXray-safeな入力欄ハイジャック判定。
    
- **【特権】`Alt+Z` (緊急フォーカス奪還)**: 閉じたShadow DOM内や見えない入力フィールドでフォーカスが麻痺した際、最上段で強制的に `deepBlur` と `document.body.focus()` を呼び出し、操作主体を取り戻すエンドポイント。
    

### 📡 protocols/utils/spatial-navigation.ts (The Radar)

JIT空間ナビゲーションのコア。状態変数（`currentIndex`）を一切持たず、呼び出された瞬間のDOM要素の座標（`getBoundingClientRect`）を元にターゲットを特定します。不要なノイズ（仮想DOMのゴースト要素など幅・高さ0の要素）は事前に排除するフィルタリング機構を備えます。

---

## 7. 現在のキーバインド一覧 (Base Protocol)

いかなる特化プロトコルにも該当しない場合のデフォルトマッピングです。

|**キー**|**（単押し）アクション**|**Shift + キー（修飾あり） アクション**|
|---|---|---|
|**W / S**|スクロールアップ / ダウン (画面の約80%)|ページの**最上部 / 最下部**へスクロール|
|**A / D**|**前 / 次**のタブへ移動|**最初**のタブへ移動 / タブを**複製**|
|**Q / E**|履歴 **戻る / 進む**|（なし）|
|**Z**|DOMフォーカスリセット & **最上部**へスクロール|閉じたタブを開く (Undo Close)|
|**Alt + Z**|【特権】緊急フォーカス奪還 & 最上部へ|-|
|**F**|チートシート（HUD）の表示トグル|（なし）|
|**X / R / M**|（なし）|現在のタブを **閉じる / リロード / ミュート**|
|**G / T**|（なし）|**他のタブを破棄** / 全てのタブを**クリーンアップ**|
|**P**|Phantom モードの **ON/OFF** トグル|Walker モード全体の **ON/OFF** トグル|

---

## 8. 状態管理と UI カスケードルール (DRY State Specification)

拡張機能の状態は、`chrome.storage.local` にて以下の論理的階層で厳密に管理され、すべての型定義とデフォルト初期値は `src/config/state.ts` にのみ記述されます（DRY原則）。

- **`global`**: `walkerMode` (Tier 1), `blockOneTap`, `safetyEnter` 等。
    
- **`phantom`**: `master` (Tier 2), `xWalker` (Tier 3) 等、各サイト固有プロトコル。
    
- **`alm`**: `enabled` (Smart Tab Discard), `excludeDomains` (休眠保護リスト)。
    

**データ隔離の境界線（Storage Boundary）**:

- **拡張機能スコープ (`chrome.storage.local`)**: アプリケーション自体の設定、動作モード、プロトコル設定（カラー等）など、全コンテナで統一されるべき「システムの状態」。
    
- **コンテナ/オリジンスコープ (`window.localStorage`)**: 同一ドメインであっても、Firefoxコンテナ等によってアカウントごとに分離されるべき「ユーザーの作業コンテキスト（例：特定アカウントでのみ有効な星の位置情報）」。これらを不用意に `chrome.storage` に集約すると、別コンテナでの操作が全コンテナに波及する致命的なデータ破壊（先祖返りや位置ズレ）を引き起こすため、明確に責務を分離すること。
    

**UIカスケード制御**: 上位TierがOFFの場合、下位TierのDOM要素には `disabled-section` クラスを付与し、物理的に操作不能（グレーアウト）にしなければなりません。

---

## 9. 拡張ルール：新しいドメインプロトコルを追加するには

特定のサイト専用の特殊な操作（Domain Protocols）を追加する場合は、以下の厳格なルールに従ってください。

### ❌ 絶対にやってはいけないこと (DON'Ts)

- **状態変数（Index）の保持禁止**: プロトコル内に `currentIndex` や配列のキャッシュを設けてはなりません。DOMのスクロールズレによる誤爆を防ぐため、ターゲットの捕捉は必ず `spatial-navigation.ts` に委譲してください。
    
- **`kernel.ts` の汚染禁止**: 特定のホスト名に依存するロジックや初期化関数を `kernel.ts` に直書きしてはなりません。
    
- **独自リスナーの禁止**: プロトコル内で独自に `window.addEventListener('keyup', ...)` や独自カスタムイベントをリッスンしないでください。すべてのイベントは `kernel.ts` が一括捕捉し、ルーター経由（`handleKey`, `handleKeyUp`, `handleReset` 等）で受け取る必要があります。
    
- **設定値のハードコード禁止**: 色、スクロールオフセット、機能のON/OFFなどのドメイン固有設定をプロトコルファイル内に直書きしないでください。必ず `config/state.ts` に型とデフォルト値を定義し、ルーターの `onStateUpdate` フックを経由して取得してください。（※前述のコンテナ隔離が必要なユーザー固有の操作データは除く）
    

### ⭕ 正しい追加手順 (DOs)

1. `src/protocols/` に新ファイル（例: `youtube-walker.ts`）を作成。
    
2. `router.ts` に定義された `DomainProtocol` インターフェースを実装。`matches` メソッドで柔軟なパス判定を行う。
    
3. `onStateUpdate` フックを実装し、状態変更時に自身の初期化や設定のロード（Deep Mergeによる防壁処理を含む）を行う。
    
4. アクション（J/Kでの移動など）は `focusNextTarget` や `getCurrentTarget` を呼び出し、返却された要素に対してロジック（`click()` 等）を実行する。
    
    _(※ ただし、URL遷移を伴うルーティング機能は空間ナビゲーションとは別軸であるため、ステート駆動のロジックとしてプロトコル内に維持する)_
    
5. 作成したプロトコルを `kernel.ts` で `router.register(new YoutubeWalkerProtocol())` としてルーターに登録。
    
6. `messages.json` にテキストを追加し、Popup/Options に設定UIを実装する。
    

### 🎨 掟の緩和：Domain-Specific UI の生成許可

ダッシュボード等の「特定のドメイン内で完結する独自の巨大UI」に限り、プロトコル内での直接的なDOM生成を許可します。ID/Classのネームスペース化やShadow DOMを利用し、既存レイアウトの破壊を防いでください。

### 📐 Cheat Sheet（HUD）の統一規格

各プロトコルがチートシートを実装する場合、UIの破綻を防ぐため以下のデザインシステムを厳守すること。

- **起動キー**: `F` キー。_(※以前のHから変更済)_
    
- **デザイン**: 背景は黒半透明（`rgba(15, 15, 20, 0.85)` + `backdrop-filter: blur(12px)`）。アクセントカラーはオレンジ（`#ff8c00` や `#ffac30`）。
    
- **コンテンツ**: 表示テキストはすべて `messages.json` から i18n 経由で取得すること。
    

---

## 10. 汎用設定（General Settings）と Middleware 拡張のガイドライン

全サイトにまたがって動作する防壁機能や入力監視（例: SafetyEnterやパスワード欄の保護など）を追加する場合、`kernel.ts` のメインリスナー内に処理を直書き（ハードコード）することはアーキテクチャ違反となります。

新しい汎用フックを実装する場合は、以下の **Middleware パターン** を使用してください。

1. `src/protocols/` にミドルウェアファイルを作成する（例: `password-shield.ts`）。
    
2. `router.ts` に定義された `MiddlewareProtocol` インターフェース（`handleEvent(event: KeyboardEvent): boolean`）を実装するクラスを作成する。
    
3. `kernel.ts` にて、`router.registerMiddleware(new PasswordShieldMiddleware())` のように登録する。
    

**このルールに従うだけで、新しく作成したミドルウェアは自動的にルーター連鎖の最上流（プロトコルの評価より前）に組み込まれます。** `kernel.ts` を汚染することなく、システム全体のあらゆるキーボードイベントを安全にフックし、必要に応じて評価・遮断（伝播停止）することが可能です。