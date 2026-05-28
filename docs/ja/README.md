# docs/ja README

# Codori 日本語ドキュメント案内

## このフォルダについて

`docs/ja/`は、Codoriプロジェクトの日本語正本です。

Codoriでは、世界観・キャラクター設定・LINEスタンプ方針・表示文字・制作判断は、原則として日本語版を優先します。

旧英語版docsは、現在は`docs/archive/en-superseded-2026-05-22/`へ退避しています。

今後英語版が必要になった場合も、退避版を正とせず、必ず`docs/ja/`の最新内容から作成します。

---

# Codoriの基本方針

Codoriは、
ウクレレや音楽コードを「かわいい鳥キャラクター」で覚えるためのIP・学習・スタンププロジェクトです。

基本ルール：

- 本番キャラクター = 元の白い鳥
- コード種類 = 白い鳥のアクション違い
- 音名 / キー = コード名・運指画像・キー色
- フォーム / 展開形 = 運指画像・ポーズ・学習状態
- テンション = 小物・光・浮遊感・補助モチーフ

ただし、音楽理論の完全再現よりも、まず「この子かわいい」と思えることを優先します。

---

# 最初に読むファイル

Codex、Claude Code、または人間が作業を始める場合は、まず以下を確認してください。

```text
core/code-bird-world.md
core/code-bird-system.md
core/code-bird-character-guide.md
core/chord-family-bird-mapping-policy.md
core/white-bird-action-system.md
core/visual-style-guide.md
core/world-tone-guide.md
core/logo-style-guide.md
characters/chord-expression-and-key-color-policy.md
```

この8つがCodoriの基本設定です。

---

# フォルダ構成

推奨構成は以下です。

```text
docs/ja/
├── README.md
├── core/
├── characters/
├── learning/
├── production/
├── stickers/
├── workflow/
├── management/
└── archive/
```

---

# core/

Codoriの正本となる基本仕様を置く場所です。

## 主なファイル

```text
core/code-bird-world.md
core/code-bird-system.md
core/code-bird-character-guide.md
core/chord-family-bird-mapping-policy.md
core/visual-style-guide.md
core/world-tone-guide.md
core/logo-style-guide.md
core/white-bird-action-system.md
```

## 役割

- 世界観
- コード体系
- キャラクター基本方針
- 元の白い鳥とコード種類アクション対応の固定部分・暫定部分
- ビジュアルルール
- 言葉の温度感
- ロゴの初期方針

を管理します。

## 注意

ここに書かれている内容は、他の制作ファイルより優先します。

旧英語版や古い仕様と食い違う場合は、`core/`の日本語版を優先します。

---

# characters/

キャラクターごとの詳細や拡張計画を置く場所です。

## 主なファイル

```text
characters/major-character-sheet.md
characters/minor-character-sheet.md
characters/seventh-character-sheet.md
characters/add9-character-sheet.md
characters/chord-expression-and-key-color-policy.md
characters/initial-four-white-bird-action-decision.md
characters/initial-four-white-bird-action-review.md
characters/remaining-white-bird-action-review.md
characters/white-bird-action-single-review.md
characters/m7-maj7-mm7-production-brief.md
characters/m7-night-sparrow-generation-prompts.md
characters/m7-night-sparrow-formal-candidate-review.md
characters/pre-line-chord-action-completion-plan.md
characters/white-bird-action-production-brief.md
characters/starter-birds-overview.md
characters/character-expansion-roadmap.md
```

## 役割

- Majorなど個別キャラの設定
- 正式4鳥の役割・表情・NG差分
- 初期4コードを白い鳥アクション差分として確定するメモ
- 初期4コードの白い鳥アクション初回レビュー
- 残りコードの白い鳥アクション初回レビュー
- 白い鳥アクションの単体化と96px確認レビュー
- m7 / maj7 / mM7の制作前ブリーフ
- LINE前にコードアクションを完成させる計画
- m7 / 夜雀の初回画像生成プロンプト
- m7 / 夜雀の初回生成レビュー
- 白い鳥アクション差分の制作ブリーフ
- 初期4鳥の比較
- 今後増やすキャラのロードマップ

を管理します。

---

# learning/

ウクレレコード記憶アプリと学習設計に関するファイルを置く場所です。

## 主なファイル

```text
learning/ukulele-chord-memory-system.md
learning/chord-training-policy.md
learning/training-stage-roadmap.md
learning/practice-mode-mvp-spec.md
learning/practice-mode-mvp-implementation-review.md
learning/ukulele-fingering-display-guide.md
learning/initial-four-chord-data.md
learning/chord-key-expansion-roadmap.md
learning/app-mvp-screen-spec.md
learning/app-mvp-prototype-plan.md
learning/app-mvp-formal-birds-review.md
learning/app-mvp-learning-experience-review.md
learning/app-expansion-set-01-integration-review.md
learning/next-expansion-decision-review.md
learning/a7-d7-expansion-prep.md
learning/a7-d7-app-integration-review.md
learning/m7-app-integration-review.md
learning/all-main-chords-generation-review.md
learning/app-to-sticker-asset-bridge.md
```

## 役割

- ウクレレコード記憶法
- 図鑑モードと練習モードを分けたコードトレーニング方針
- Cのコード種類、ダイアトニック、ジャズ、キー展開などのステージ制ロードマップ
- Stage 0 / 1 / 2 / 5を最初に実装する練習モードMVP仕様
- 練習モードMVPの実装レビュー
- コード名・フォーム・音・鳥キャラの接続
- キャラ画像とは別に表示するウクレレ運指画像
- 初期4コードの学習データ
- 初期4コード後のコード・キー展開ロードマップ
- アプリMVP画面仕様
- アプリMVPプロトタイプ計画
- 正式4鳥反映後のアプリMVP確認
- 初回ユーザー目線の学習体験レビュー
- Expansion Set 01のアプリ統合レビュー
- 次のコード・鳥種拡張判断レビュー
- A7 / D7追加前の学習意味・必要データ整理
- A7 / D7のアプリ統合レビュー
- m7のアプリ仮実装レビュー
- 12音 x 主要11種類の全主要コード生成レビュー
- アプリ素材からLINEスタンプ派生への橋渡し
- アプリ化するための学習構造
- クイズ、図鑑、コード進行学習への展開

を管理します。

## 注意

Codoriの主軸はウクレレコード記憶アプリです。

LINEスタンプは、アプリ用に作成したキャラクター画像・コードネーム画像・音声素材を使い回せる派生展開として扱います。

---

# production/

画像生成・レビュー・制作テストに関するファイルを置く場所です。

## 主なファイル

```text
production/first-image-prompts.md
production/image-generation-prompts.md
production/image-generation-log-template.md
production/silhouette-test-notes.md
production/major-image-review-checklist.md
production/major-candidate-comparison.md
production/major-final-generation-prompt.md
production/formal-starter-birds-production-spec.md
production/formal-starter-birds-generation-prompt.md
production/formal-starter-birds-review.md
production/formal-bird-wingtip-touchup-guide.md
production/formal-bird-wingtip-touchup-result.md
production/codex-major-generation-session.md
```

## 役割

- 画像生成プロンプト
- Major画像レビュー
- 正式初期4鳥の作り直し仕様
- 正式初期4鳥ラインナップのレビュー
- 正式4鳥の羽先端タッチアップ指示
- 正式4鳥の羽先端タッチアップ候補結果
- 白黒シルエットテスト
- 画像生成ログ
- 制作セッション手順

を管理します。

## 注意

画像を大量生成する前に、必ず`core/visual-style-guide.md`と`core/world-tone-guide.md`を確認してください。

---

# stickers/

LINEスタンプ関連の計画と制作手順を置く場所です。

## 主なファイル

```text
stickers/line-stamp-plan.md
stickers/line-sticker-production-workflow.md
stickers/codori-pilot-sticker-production-pack.md
stickers/pilot-sticker-review.md
stickers/sound-sticker-plan.md
stickers/chord-text-style-review.md
stickers/line-export-spec.md
stickers/app-mvp-line-derivative-export.md
```

## 役割

- LINEスタンプ第1弾の方向性
- 4個パイロット制作
- 16個セットへの展開
- コードネーム表示・構図・レビュー
- コードネーム文字スタイル確認
- サウンド付きスタンプ計画
- LINE書き出し仕様とサイズ確認
- アプリMVP素材からLINE候補への正式派生書き出し

を管理します。

## 注意

Codoriのスタンプは、コードネームと音が結びつく「かわいいコード学習スタンプ」として成立させます。

ただし、理論説明を詰め込みすぎず、キャラクターとして使いたいかわいさを優先します。

---

# workflow/

作業段階ごとの進行パックや`/goal`移行判断を置く場所です。

## 主なファイル

```text
workflow/current-work-order.md
workflow/goal-readiness-task-list.md
workflow/pre-goal-checklist.md
workflow/codori-visual-production-next-steps-pack.md
workflow/codori-initial-visual-decision-pack.md
workflow/initial-visual-decision.md
workflow/codori-goal-transition-pack.md
```

## 役割

- 次に何をするか
- いつ`/goal`に進むか
- まだ進めない理由
- `/goal`実行前に必要なタスク
- AGENTS.md、CODEX_GOAL.md、FIRST_MESSAGE.md更新タイミング

を管理します。

## 注意

`workflow/`は進行用です。恒久的な正本は`core/`に置きます。

---

# management/

ファイル管理やアセット管理のルールを置く場所です。

## 主なファイル

```text
management/asset-naming-and-folder-guide.md
```

## 役割

- assetsフォルダ構成
- 画像命名
- ラフ・採用案・書き出し管理
- バージョン管理

を管理します。

---

# 作業フェーズ別に読むファイル

## 世界観を確認したいとき

```text
core/code-bird-world.md
core/world-tone-guide.md
```

---

## コード体系を確認したいとき

```text
core/code-bird-system.md
core/code-bird-character-guide.md
```

---

## 絵柄を確認したいとき

```text
core/visual-style-guide.md
core/logo-style-guide.md
characters/starter-birds-overview.md
```

---

## ロゴを確認したいとき

```text
core/logo-style-guide.md
```

---

## Majorを生成・レビューしたいとき

```text
characters/major-character-sheet.md
production/first-image-prompts.md
production/major-final-generation-prompt.md
production/major-image-review-checklist.md
production/major-candidate-comparison.md
production/silhouette-test-notes.md
workflow/current-work-order.md
```

---

## 初期4鳥を比較したいとき

```text
characters/starter-birds-overview.md
production/silhouette-test-notes.md
workflow/codori-initial-visual-decision-pack.md
workflow/initial-visual-decision.md
```

---

## LINEスタンプを作りたいとき

```text
stickers/line-stamp-plan.md
stickers/line-sticker-production-workflow.md
stickers/codori-pilot-sticker-production-pack.md
stickers/pilot-sticker-review.md
```

---

## /goalに進んでよいか判断したいとき

```text
workflow/pre-goal-checklist.md
workflow/current-work-order.md
workflow/codori-goal-transition-pack.md
```

---

# Codex作業時の基本ルール

Codexで作業するときは、以下を守ってください。

1. まず`AGENTS.md`と`CODEX_GOAL.md`を読む
2. 次にこの`docs/ja/README.md`を読む
3. 作業内容に応じて関係する`docs/ja/`ファイルを読む
4. 日本語正本を優先する
5. 不明点は仮決定し、未決事項に記録する
6. 大量生成や大規模変更は、明示指示があるまで行わない

---

# まだ避けること

現時点では、以下は慎重に扱います。

- 32個以上のLINEスタンプ量産
- 全コード図鑑化
- 12キー展開
- 大量カラバリ
- グッズ量産設計

まずは初期4鳥、初期4コード、アプリMVPの品質を優先します。

---

# 現在の優先フェーズ

現在の優先は：

```text
初期4鳥のビジュアル基準固定（承認済み）
↓
初期4コードの学習データ・運指画像整理（完了）
↓
4個パイロットLINEスタンプ派生確認（承認済み）
↓
アプリMVP設計・Webプロトタイプ確認（完了）
↓
Expansion Set 01統合（完了）
↓
A7 / D7追加（完了）
↓
m7仮実装（完了）
↓
正式m7鳥の画像生成判断
```

です。

旧英語版ドキュメントはアーカイブ済みです。今後の制作判断は、`docs/ja/`の日本語正本を基準にします。

---

# Codoriらしさの最終確認

どの作業でも、最後に以下を確認します。

```text
この子、本当にCodoriの世界にいそう？
```

そして、

```text
普通にLINEで使いたい？
```

この2つが弱い場合は、量産せずにビジュアルや世界観へ戻って調整します。
