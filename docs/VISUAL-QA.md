# 画面チェック（VISUAL QA）

レイアウトの重なり・はみ出し・文字切れを、ヘッドレス Chrome で自動検出する。
画像は目視でも確認する。

## 実行

```bash
npm run build
npm run visual:check -- --serve --strict
```

- `--serve` … `vite preview` を起動して検査（`dist/` を使用）
- `--build` … 先に `npm run build`
- `--strict` … issue が 1 件でもあれば exit 1
- `--sizes 1440x900,390x844,360x800`
- `--routes home,learn,memorize,practice,chart,yaku,settings`
- 出力先: `D:\AIWork\visual\mahjong`（`VISUAL_OUT_DIR` / `--out` で変更）

CI では `.github/workflows/visual.yml` が PR ごとに実行し、スクリーンショットを artifact に残す。

## 検査項目

| 項目 | 内容 |
|---|---|
| horizontal-overflow | ドキュメントがビューポートより横に広い |
| outside-viewport | テキスト/操作要素が画面外（スクロール領域内は除外） |
| control-overlap | ボタン・リンク等同士の重なり（18% 以上） |
| clipped-text | `overflow: hidden` で文字が切れている |
| fixed-overlap | 固定ヘッダー/ナビが操作要素を覆う |
| duplicate-id | 同じ id が複数 |
| duplicate-control | 同じ親の中で同名の操作要素 |
| duplicate-heading | 同じ親で同じ見出しが重複 |

`sr-only` と横スクロール領域は除外する。モバイルは**最下部までスクロールした状態**も撮影・検査する。

## 目視チェックリスト

自動検出で拾えない「デザイン上の重複・不自然さ」を確認する。

- [ ] 同じ情報（バージョン、見出し、CTA）が 2 回出ていない
- [ ] バッジ・メタ情報・再生位置などが同じ座標に重なっていない
- [ ] カード内のボタン・アイコンが重なっていない
- [ ] トースト/通知が積み重ならない（本アプリはトーストなし）
- [ ] ヘルプ・モーダルの下端が切れず、閉じるボタンに届く
- [ ] 下部ナビが本文・操作要素を覆っていない
- [ ] 360px で牌・表・選択肢が読める
- [ ] 表は横スクロールの案内があり、1 列目が固定されている
- [ ] 点数表の満貫以上が読める（コントラスト）
- [ ] 3D モード（CSS 3D / Three.js）で手牌が読め、回答 UI を圧迫していない

## 画像の場所

- ローカル: `D:\AIWork\visual\mahjong\<run>\`
- CI: `visual-screenshots` artifact（7 日保持）
- レポート: `report-*.json` に issue の一覧

## 既知の除外

- `sr-only`（読み上げ専用）は `clip` されるため `clipped-text` の対象外。
- 点数表・横スクロール可能な表は `outside-viewport` の対象外。
- Three.js の canvas は `aria-hidden`。WebGL の見た目は SwiftShader で別途撮影する。
