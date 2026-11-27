# 麻雀点数トレーナー — 設計

リーチ麻雀の点数計算を「理解する → 反復する → 身につく」ための学習・練習アプリ。
ブラウザだけで完結し、ビルド成果物は 1 枚の HTML（オフライン動作）。

## ゴール

- 点数計算が苦手な人が、役 → 翻 → 符 → 点数の流れを自分の手で再現できるようになる。
- 1 問 30 秒で解ける反復練習と、間違いをその場で分解して見せる解説。
- 実際の牌姿・場況（自風/場風/ツモ/ロン/ドラ/本場）で練習できる。

## 非ゴール（v0.1.0）

- 対戦・CPU・牌譜解析・ネット対戦。
- ローカル役（人和、五門斉、三連刻など）と競技独自ルール。
- アカウント・サーバー同期。保存は localStorage のみ。

## 画面

| 画面 | 内容 |
|---|---|
| ホーム | 学習進捗、今日の成績、クイック開始（学習/練習/点数表/役一覧） |
| 学習 | 6 レッスンのステップ式解説 + 各レッスン末の確認問題 |
| 覚え方 | 6 セクションの読み物 + 4 種類の暗記ドリル（間隔反復）。学習と練習の間 |
| 練習 | 出題 → 回答（翻/符/点数）→ 採点 → 解説 → 次へ。難易度 3 段階、復習キュー |
| 点数表 | 子/親 × ツモ/ロン、符 × 翻。現在の問題のセルをハイライト |
| 役一覧 | 検索・絞り込み可能な役カタログ（門前/副露の翻数、条件、例） |
| 設定 | 出題範囲、表示（牌の色/サイズ）、成績リセット、データ削除 |

### 覚え方と間隔反復

- 覚え方ガイドは `src/features/memorize/guides.ts` のデータ駆動。6 セクション（4 ステップ・符・点数表・役・反復・語呂）。
- 暗記ドリルは `src/features/memorize/drills.ts` の純粋関数。点数表穴埋め・符カウント・翻数カード・支払いクイズの 4 種類。
- 習熟度は `src/lib/srs.ts`。level 0〜5、復習間隔 1/3/7/14/30 日、1 セッション 10 問。期限が来たカードを優先する。
- 保存は `mst:v1:drill`。ドリル成績は既存の練習成績と分けて集計する。

## 技術構成

- Vite 8 + React 19 + TypeScript 7
- Tailwind CSS 4（`@tailwindcss/vite`）
- Vitest 5 + @testing-library/react + jsdom
- `vite-plugin-singlefile` で `dist/index.html` に全アセットをインライン化
- ルーターは使わない（タブ状態のみ）。URL ハッシュで画面を保持してよい。
- 永続化は `src/lib/storage.ts` に集約（キーは `mst:v1:*`、スキーマ版を持つ）。
- 外部通信・外部フォント・画像アセットなし（オフラインで完結）。フォントはシステムフォント。

## ディレクトリ

```
src/
  main.tsx
  App.tsx
  engine/          # 純粋関数のみ。DOM 依存禁止
    types.ts
    tiles.ts       # 牌の表現・文字列パース・ドラ変換
    decompose.ts   # 手牌分解（標準形/七対子/国士）
    yaku.ts        # 役判定
    fu.ts          # 符計算
    score.ts       # 点数計算（公開 API computeScore）
    problem.ts     # 出題生成（シード付き乱数）
    index.ts
  features/
    home/ learn/ memorize/ practice/ chart/ yaku/ settings/
  components/      # Tile, Hand, Meld, Layout, 選択肢, ゲージ等
  lib/             # storage, format, rng, classnames, srs
  styles/
tests/             # エンジン・UI・ドリル生成のテスト
```

## エンジン公開 API（変更禁止・UI はこれだけに依存する）

```ts
// types.ts
export type Suit = 'm' | 'p' | 's' | 'z';           // z: 1東 2南 3西 4北 5白 6發 7中
export interface Tile { suit: Suit; rank: number; red?: boolean }
export type MeldType = 'chi' | 'pon' | 'kan';
export interface Meld {
  type: MeldType;
  tiles: Tile[];                 // kan は 4 枚
  open: boolean;                 // 副露なら true（暗槓は false）
  kanKind?: 'open' | 'closed' | 'added';
  calledFrom?: 'left' | 'across' | 'right';
}
export type Wind = 1 | 2 | 3 | 4;  // 東南西北

export interface WinContext {
  tsumo: boolean;
  seatWind: Wind;
  roundWind: Wind;
  riichi: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  haitei?: boolean;      // 海底摸月
  houtei?: boolean;      // 河底撈魚
  rinshan?: boolean;     // 嶺上開花
  chankan?: boolean;     // 搶槓
  doraIndicators: Tile[];
  uraIndicators?: Tile[]; // リーチ時のみ有効
  honba: number;
  riichiSticks: number;
}

export interface ScoreInput {
  concealed: Tile[];   // 和了時の手牌（和了牌を含む）。門前なら 14 枚
  melds: Meld[];
  winTile: Tile;
  ctx: WinContext;
}

export interface YakuHit { id: string; name: string; han: number; yakuman?: number }
export interface FuItem { id: string; label: string; fu: number }

export interface ScoreResult {
  ok: true;
  han: number;              // 役 + ドラの合計
  yakuHan: number;          // 役のみ
  doraHan: number;          // ドラ・赤・裏
  fu: number;
  yaku: YakuHit[];
  fuItems: FuItem[];
  basePoints: number;       // 青天井前の基本点（満貫以上は上限後）
  limit: 'none' | 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'yakuman';
  yakumanCount: number;
  wait: 'ryanmen' | 'kanchan' | 'penchan' | 'tanki' | 'shanpon' | 'none';
  decomposition: string;    // 例: "123m 456m 789m 11p 234s"
  payments: {
    ron?: number;                        // 放銃者の支払い（本場・供託を除く）
    tsumo?: { dealer: number; nonDealer: number }; // 1 人あたり（本場を除く）
    total: number;                       // 手の合計点（本場・供託を除く）
    honba: { ron: number; tsumoEach: number };
    riichiSticks: number;                // 1000 * 本数
  };
}
export type ScoreOutcome = ScoreResult | { ok: false; error: string };

export function computeScore(input: ScoreInput): ScoreOutcome;

export interface Problem {
  id: string;
  difficulty: 'beginner' | 'standard' | 'advanced';
  input: ScoreInput;
  answer: ScoreResult;
  tags: string[];        // 主な役 id
  hint: { yaku: string[]; fu: string };
}
export function generateProblem(opts: {
  difficulty: Problem['difficulty'];
  seed?: number;
  avoidTags?: string[];
}): Problem;
```

`computeScore` は例外を投げず、不正な入力は `{ ok: false, error }` を返す。
エンジンは同一入力に対して常に同一結果（乱数・現在時刻を使わない）。

## 出題生成アルゴリズム

1. `seed` から mulberry32 で決定論的乱数を初期化（未指定なら `Date.now()`）。
2. 難易度に応じて「4 面子 + 1 雀頭」を構築する（ランダムに 14 枚を引いて当たりを待つ方式は禁止）。
   - 面子は順子/刻子を抽選。上級のみ槓子を含められる。
   - 同じ牌が 4 枚を超えないよう制約。赤 5 は各種 1 枚まで。
   - 難易度: beginner は門前・槓なし・役 1〜2・ドラ 0。standard は副露 0〜1・槓なし・役 1〜3・ドラ 0〜1・リーチあり。advanced は副露 0〜2・槓 0〜1・役 1〜6・ドラ 0〜3・本場あり。
3. 和了牌を手牌から 1 枚選び、待ちの形（両面/嵌張/辺張/単騎/双碰）を確定する。
4. 場況（自風・場風・ツモ/ロン・リーチ/一発/海底など）を難易度に応じて抽選。
5. `computeScore` で採点し、**役が 0 の手は破棄**（ドラのみは和了不可）。難易度の範囲外も破棄して再抽選（最大 2000 回）。
6. 七対子は standard 以上で 8% 程度、国士は advanced で 2% 程度の頻度で混ぜる。
7. 同じ seed + 同じオプションは常に同じ問題を返す。

出題の選択肢（UI 側）は、正解に近い誤答（符だけ違う/翻だけ違う/満貫境界）を優先して 3 つ作る。

## UI 要件

- 日本語 UI。専門用語には読み（ルビまたは括弧書き）を添える。
- 牌は CSS のみで描画（萬子=赤系、筒子=青系、索子=緑系、字牌=墨）。赤 5 は朱色。
- 練習の回答は「翻 → 符 → 点数の順に 1 問ずつ」と「まとめて 4 択」の 2 方式。設定で切替。
- 採点後は必ず、成立役（翻数）・符の内訳（+20 副底 など）・基本点の式・点数表の該当セルを同時に表示する。
- 間違えた問題は復習キューに入り、セッション末尾または「復習」タブで再出題される。
- キーボード: `1`〜`4` 選択、`Enter` 確定/次へ、`R` 復習に追加、`?` ヘルプ。
- 効果音は既定オフ（明示的に有効化した場合のみ鳴らす。v0.1.0 では実装しない）。
- `prefers-reduced-motion` を尊重。フォーカスリングを消さない。色だけで正誤を伝えない（アイコン+文言）。
- ウィンドウ幅 360px〜1920px。モバイルでも牌が読めること。

## 品質基準

- `npm run typecheck` / `npm run test` / `npm run build` がすべて成功。
- エンジンのテストは 120 ケース以上。役・符・点数・上限・支払い・不正入力を網羅。
- 出題生成のテスト: 3 難易度 × 1000 問を生成し、すべて `ok: true`・役 1 以上・支払いが点数表と一致。
- 暗記ドリル: 4 種類 × 100 シードで選択肢の重複なし・正解を含む・解説あり。SRS の間隔と期限、保存を検証。
- Lighthouse 相当の確認は不要。初回表示 1 秒以内（ローカル）。
- README に起動・ビルド・配布（単一 HTML）・ルールの前提を記載。

## マイルストーン

- v0.1.0: エンジン + 学習 + 覚え方 + 練習 + 点数表 + 役一覧 + 設定 + テスト + CI
- v0.2.0（将来）: 苦手分析の強化、出題のブックマーク、印刷用点数表、Tauri ラップ
