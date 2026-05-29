# Codori 現在の作業順

## このファイルについて

このファイルは、Codoriプロジェクトの現在フェーズでやるべき作業順を整理するための進行メモです。

対象フェーズ：

```text
初期4鳥のビジュアル基準固定
↓
初期4コードのアプリ学習データ整理
↓
4個パイロットLINEスタンプ派生確認
↓
/goalによるアプリMVP設計
↓
Webプロトタイプ確認
↓
ロゴ初期ラフ確認
↓
Expansion Set 01統合
↓
A7 / D7追加
↓
m7仮実装
↓
全主要コード生成カタログ
↓
練習モードMVP仕様
↓
練習モードMVP実装
```

現在は、正式4鳥・初期4コード・Deep Blue文字スタイル・ロゴrough-04・Expansion Set 01、A7 / D7追加、m7仮実装、12音 x 主要11種類の全主要コード生成カタログに加えて、練習モードMVPの最小UIを実装した段階です。

---

# 現在の前提

- `docs/ja/` を日本語正本とする。
- 初期4鳥は Major / minor / 7 / add9 を中心に扱う。
- 正式4鳥候補001を正式採用済み。
- Codoriの主軸はウクレレコード記憶アプリ。
- LINEスタンプはアプリ素材から派生する。
- 初期4鳥は `assets/approved/characters/` に正式反映済み。
- `/goal` 移行判断はアプリMVP設計に限定して承認済み。
- 最初のWebプロトタイプは `app/` に作成済み。
- アプリ素材からLINEスタンプ派生への橋渡しは `docs/ja/learning/app-to-sticker-asset-bridge.md` に整理済み。
- スタンプ文字はコードネームのみとし、日常あいさつ文は入れない。
- ロゴはDeep Blueと白鳥世界観を軸に、文字ロゴ + 小鳥アイコンの初期ラフから確認する。
- ロゴrough-04は現フェーズの仮採用として扱う。
- 旧英語版docsは`docs/archive/en-superseded-2026-05-22/`へ退避済み。
- `docs/ja/`内の基本仕様は日本語正本として統合済み。
- 本番方針は、元の白い鳥を使い、コード種類をアクション違いと小さなワンポイントで表す。
- コード種類ごとのアクションとワンポイントは固定方針とし、`docs/ja/core/white-bird-action-system.md` を正とする。
- ワンポイント詳細は `docs/ja/characters/white-bird-one-point-accent-system.md` を正とする。
- キー違いは色で表す。アクション、表情、基本ポーズ、ワンポイント形状はキーで変えない。
- 初期4鳥に12キー色を当てた確認シートを `assets/app/review/key-color-policy-2026-05-27/` に作成済み。
- アプリUIにキー色の小チップと淡い背景色を最小反映し、`assets/app/review/key-color-app-2026-05-27/` でPC幅・スマホ幅を確認済み。
- A7 / D7は新キャラではなく、7アクションのキー展開として扱う。
- D7の主表示は初心者向けに`2020`を採用し、`2223`は将来の比較候補として残す。
- m7は次のコード種類として仮実装済み。
- m7アクションは、正式画像生成前のため元の白い鳥で表示する。
- 全主要コードカタログは `all-main-chords` として追加済み。
- 全主要コードカタログは正式教材完成版ではなく、全体確認用の生成カタログとして扱う。
- 全主要コードカタログには、コード名検索、音名フィルタ、コード種類フィルタを追加済み。
- 検索・フィルタ後のコードだけで、カード / ききくらべ / 音あてが動く。
- 音あて補助音は、同じ根音なら`土台をきく`、根音が混ざるなら`基準をきく`に自動切替する。
- `基準をきく`では答えの根音ではなく、Stageごとの`quiz_reference_root`を鳴らす。
- 自動生成した運指は、正式教材化前に人間が確認する。
- コードトレーニング方針は `docs/ja/learning/chord-training-policy.md` を正とする。
- ステージ制ロードマップは `docs/ja/learning/training-stage-roadmap.md` を正とする。
- 練習モードMVPの最小UI仕様は `docs/ja/learning/practice-mode-mvp-spec.md` を正とする。
- 練習モードMVPの実装レビューは `docs/ja/learning/practice-mode-mvp-implementation-review.md` に記録する。
- `全コード`は図鑑モード、初心者向け練習は少数コードの練習モードとして分ける。
- 最初の練習モード実装対象は Stage 0 / Stage 1 / Stage 2 / Stage 5 とする。
- 2026-05-29時点で、v7白い鳥アクションはアプリに通常表示として反映済み。ただし最終完成ではない。
- 次の作業はv8白い鳥アクション制作。ポーズだけでなく、コード種類ごとの小さなワンポイントを追加する。
- v7 / v8制作ブリーフは `docs/ja/characters/white-bird-action-v7-production-brief.md` を正とする。

---

# 今やるべき作業順

## Step 1: 日本語正本の確認

読むファイル：

- `docs/ja/README.md`
- `docs/ja/core/visual-style-guide.md`
- `docs/ja/core/world-tone-guide.md`
- `docs/ja/characters/starter-birds-overview.md`
- `docs/ja/characters/major-character-sheet.md`

目的：

- Codoriらしさを確認する。
- 絵柄のNG方向を確認する。
- 初期4鳥のコード印象差を確認する。

状態：

- [x] 準備済み

---

## Step 2: Major候補を生成・整理

使うファイル：

- `docs/ja/production/first-image-prompts.md`
- `docs/ja/production/major-final-generation-prompt.md`
- `docs/ja/production/codex-major-generation-session.md`
- `docs/ja/production/major-image-review-checklist.md`
- `docs/ja/production/major-candidate-comparison.md`
- `docs/ja/production/image-generation-log-template.md`

目的：

- Majorを複数案生成する。
- Codoriらしい方向を見つける。
- 採用候補を3案程度に絞る。
- 候補A/B/Cを比較し、minor / 7 / add9へ展開できるか確認する。

状態：

- [x] 実施済み

注意：

- ここでは大量生成しない。
- 初期4鳥は正式採用済み。
- 次は正式4鳥ベースでアプリMVPとLINE候補を確認する。

---

## Step 3: minor / 7 / add9へ展開

使うファイル：

- `docs/ja/production/first-image-prompts.md`
- `docs/ja/characters/starter-birds-overview.md`
- `docs/ja/production/silhouette-test-notes.md`

目的：

- Majorの方向を保ちながら、初期4鳥の差を作る。
- 色だけでなく、姿勢・表情・シルエットで違いを出す。

状態：

- [x] ラフ実施

記録：

- `assets/rough/initial-four/initial_four_species_lineup_2026-05-19_001.png`
- `assets/rough/initial-four/initial_four_species_lineup_2026-05-19_001_silhouette.png`

暫定判断：

- 前回の表情差分寄りのラフより、鳥種差は出ている。
- minorは内向き、7は前傾と片羽、add9は上向きと星で差が読める。
- 7は表情と色が強めなので調整余地あり。
- add9は星アクセサリ量を減らす余地あり。
- minor個別候補シートを作成済み：`assets/rough/minor/minor_species_variation_sheet_2026-05-19_001.png`
- minorは1番をユーザー指定の本命候補として記録。
- minor 1番の単体切り出しを作成済み：`assets/rough/minor/minor_candidate_1_crop.png`
- minor 1番の小サイズ確認を作成済み：`assets/rough/minor/checks/minor_candidate_1_96px.png` / `64px` / `48px` / `32px`
- minor 1番の白黒シルエット確認を作成済み：`assets/rough/minor/checks/minor_candidate_1_silhouette.png`
- minor 1番は64pxで顔と内向き感が読める。32pxでは足と羽の細部が潰れるが、鳥種差は残る。
- 7の個別候補シートを作成済み：`assets/rough/seventh/seventh_species_variation_sheet_2026-05-19_001.png`
- 7は番号ルールを左上から横に 1 2、下段を 3 4 とする。
- 7は1番が素直で安全、3番が動き強め、4番がかわいいがMajor寄り、2番は表情が強め。
- 7は2番をユーザー指定の本命候補として記録。
- 7 2番の単体切り出しを作成済み：`assets/rough/seventh/seventh_candidate_2_crop.png`
- 7 2番の小サイズ確認を作成済み：`assets/rough/seventh/checks/seventh_candidate_2_96px.png` / `64px` / `48px` / `32px`
- 7 2番の白黒シルエット確認を作成済み：`assets/rough/seventh/checks/seventh_candidate_2_silhouette.png`
- 7 2番は64pxで顔、頭のハネ、横向き気味の姿勢が読める。32pxでもMajor / minorとの差は残る。
- add9の個別候補シートを作成済み：`assets/rough/add9/add9_species_variation_sheet_2026-05-19_001.png`
- add9は番号ルールを左上から横に 1 2、下段を 3 4 とする。
- add9は1番が上向き感とかわいさのバランス良し、2番は透明感あり、3番は音符タグが強め、4番は軽い動きが強め。
- add9は1番をユーザー指定の本命候補として記録。
- add9 1番の単体切り出しを作成済み：`assets/rough/add9/add9_candidate_1_crop.png`
- add9 1番の小サイズ確認を作成済み：`assets/rough/add9/checks/add9_candidate_1_96px.png` / `64px` / `48px` / `32px`
- add9 1番の白黒シルエット確認を作成済み：`assets/rough/add9/checks/add9_candidate_1_silhouette.png`
- add9 1番は64pxで星、顔、上向き感が読める。32pxでは星が小さくなるが、見上げる姿勢は残る。
- Major / minor / 7 / add9の4鳥を並べた比較シートを作成済み：`assets/rough/initial-four/initial_four_selected_lineup_2026-05-20_001.png`
- 4鳥小サイズ比較を作成済み：`assets/rough/initial-four/checks/initial_four_selected_lineup_2026-05-20_001_small.png`
- 4鳥白黒比較を作成済み：`assets/rough/initial-four/checks/initial_four_selected_lineup_2026-05-20_001_silhouette.png`
- Majorの頭上ハネを基本2本にする方針へ変更。
- Major頭上ハネ修正版を作成済み：`assets/rough/major/major_current_base_2026-05-20_002_two_head_feathers.png`
- Major頭上ハネ修正版を反映した4鳥比較シートを作成済み：`assets/rough/initial-four/initial_four_selected_lineup_2026-05-20_002.png`
- Major頭上ハネ基本2本版を作成済み：`assets/rough/major/major_current_base_2026-05-20_003_two_feathers_default.png`
- Major頭上ハネ基本2本版を反映した4鳥比較シートを作成済み：`assets/rough/initial-four/initial_four_selected_lineup_2026-05-20_003.png`
- 4鳥は同じ白いCodori世界に見える。Majorは安定、minorは内向き、7はクセと動き、add9は見上げる軽さで区別できる。
- 次は4個パイロットLINEスタンプ試作へ進めるか、ユーザー確認を待つ。

---

## Step 4: 初期4鳥を比較

記録先：

- `docs/ja/workflow/initial-visual-decision.md`

確認すること：

- 同じ世界に見えるか。
- コード印象差があるか。
- 小サイズでも読めるか。
- 白黒シルエットで区別できるか。
- LINEスタンプに展開できそうか。

状態：

- [x] 実施済み

注意：

- このステップは完了済み。
- 初期4鳥は正式採用済み。

---

## Step 4.5: 正式初期4鳥の制作仕様を固める

使うファイル：

- `docs/ja/production/formal-starter-birds-production-spec.md`
- `docs/ja/production/formal-starter-birds-generation-prompt.md`
- `docs/ja/core/visual-style-guide.md`
- `docs/ja/learning/ukulele-chord-memory-system.md`

目的：

- 現在の4鳥を雛形として整理する。
- 正式4鳥の作り直し条件を固定する。
- コード種類、音名、フォームの違いを混同しない制作ルールにする。
- 4鳥ラインナップ生成から正式化する流れを決める。

状態：

- [x] 制作仕様作成済み
- [x] ラインナップ生成プロンプト作成済み
- [x] 正式4鳥ラインナップ候補001を生成する
- [x] 候補001を `assets/formal/lineups/` に保存する
- [x] 候補001レビューを記録する
- [x] 人間が候補001を正式基準として承認する
- [ ] 個別正式版へ描き直す

記録：

```text
assets/formal/lineups/initial_four_formal_lineup_2026-05-22_001.png
assets/formal/checks/initial_four_formal_lineup_2026-05-22_001_1024px.png
docs/ja/production/formal-starter-birds-review.md
```

判断：

```text
候補001をこのまま正式基準として進める。
候補002は作成しない。
次は個別切り出し、透明PNG化、アプリMVP/LINE候補への反映。
```

反映状況：

- [x] 個別4鳥へ切り出し
- [x] 背景削除・透明PNG化
- [x] 小サイズ確認画像作成
- [x] アプリMVP確認用データ作成
- [x] `?formal=1` で正式候補001を確認できるようにする
- [x] LINEスタンプ候補の再書き出し
- [x] docs更新
- [x] `assets/approved/characters/` へ正式反映
- [x] 旧approved素材をアーカイブへ退避
- [x] 正式4鳥の個別キャラクターシート更新
- [x] NG差分の記録

正式反映：

```text
assets/approved/characters/major.png
assets/approved/characters/minor.png
assets/approved/characters/seventh.png
assets/approved/characters/add9.png
assets/approved/app/initial_four_lineup.png
```

旧素材アーカイブ：

```text
assets/archive/approved-before-formal-2026-05-22/
```

正式仕様：

```text
docs/ja/characters/major-character-sheet.md
docs/ja/characters/minor-character-sheet.md
docs/ja/characters/seventh-character-sheet.md
docs/ja/characters/add9-character-sheet.md
docs/ja/characters/starter-birds-overview.md
```

---

## Step 5: 4個パイロットスタンプを試作

使うファイル：

- `docs/ja/stickers/codori-pilot-sticker-production-pack.md`
- `docs/ja/stickers/line-sticker-production-workflow.md`

記録先：

- `docs/ja/stickers/pilot-sticker-review.md`

対象：

- Major「C」
- minor「Cm」
- 7「C7」
- add9「Cadd9」

状態：

- [x] 文字なしラフ実施

記録：

- `assets/rough/stickers/pilot/pilot_major_yahho_2026-05-20_001.png`
- `assets/rough/stickers/pilot/pilot_minor_uun_2026-05-20_001.png`
- `assets/rough/stickers/pilot/pilot_seventh_ok_2026-05-20_002.png`
- `assets/rough/stickers/pilot/pilot_add9_waa_2026-05-20_001.png`
- `assets/rough/stickers/pilot/pilot_sticker_4set_sheet_2026-05-20_001.png`
- `assets/rough/stickers/pilot/checks/pilot_sticker_4set_sheet_2026-05-20_001_256px.png`
- `assets/rough/stickers/pilot/text/pilot_major_yahho_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/text/pilot_minor_uun_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/text/pilot_seventh_ok_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/text/pilot_add9_waa_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/text/pilot_sticker_4set_text_sheet_2026-05-21_002.png`
- `assets/rough/stickers/pilot/text/checks/pilot_sticker_4set_text_sheet_2026-05-21_002_256px.png`
- `assets/rough/stickers/pilot/chord-text/pilot_major_C_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/chord-text/pilot_minor_Cm_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/chord-text/pilot_seventh_C7_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/chord-text/pilot_add9_Cadd9_text_2026-05-21_002.png`
- `assets/rough/stickers/pilot/chord-text/pilot_sticker_4set_chord_text_sheet_2026-05-21_002.png`
- `assets/rough/stickers/pilot/chord-text/checks/pilot_sticker_4set_chord_text_sheet_2026-05-21_002_256px.png`

暫定判断：

- 4個とも同じ作品に見える。
- 64pxで顔とコード印象は読める。
- 7は最初の生成で人間のサイン風の羽が出たため、シンプルな上げ羽版に差し替え済み。
- 旧日本語テキスト版からコードネーム版へ方針変更。
- コードネーム版は `C / Cm / C7 / Cadd9` で作成済み。
- 最終的にはサウンド付きスタンプにする前提。
- 本番制作では、文字なし絵を先に透過PNG化し、その後コードネームを後載せする。
- コードネームは大きく、見やすい色と必要な縁取りで視認性を優先する。
- B案Deep Blueを仮本命文字スタイルとして4個に適用済み。
- 確認画像：`assets/rough/stickers/pilot/chord-text/deep-blue/pilot_sticker_4set_deep_blue_2026-05-21_001.png`
- Cadd9は1行コンパクト版で可読性を改善済み。
- 更新確認画像：`assets/rough/stickers/pilot/chord-text/deep-blue-compact-add9/pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002.png`
- LINEサイズ確認を実施済み。
- LINEサイズ確認画像：`assets/line/review/pilot-size-check/codori_line_review_4set_370x320_sheet.png`
- 次はユーザー判断待ち。

---

## Step 6: /goal準備へ進むか判断

使うファイル：

- `docs/ja/workflow/pre-goal-checklist.md`
- `docs/ja/workflow/codori-goal-transition-pack.md`
- `docs/ja/workflow/goal-readiness-task-list.md`

判断：

- [ ] 初期4鳥を修正する
- [ ] 文字スタイルを修正する
- [x] approved整理に進む
- [x] アプリMVP設計の `/goal` 準備に進む

状態：

- [x] ユーザー承認済み
- [x] 正式4鳥ベースのアプリMVP確認に進行中
- [x] アプリMVPからLINE候補への正式派生書き出しを整理済み

追加判断：

- Codoriの主軸はウクレレコード記憶アプリ。
- LINEスタンプはアプリ用画像・コードネーム・音声素材の派生展開。
- `/goal` 前に、初期4鳥だけでなく運指画像・学習データ・アプリ初期画面の最小仕様も必要。

---

## Step 7: 正式4鳥ベースのアプリMVPを確認

使うファイル：

- `app/index.html`
- `app/styles.css`
- `app/main.js`
- `assets/app/data/initial-four-chords.json`
- `docs/ja/learning/app-mvp-screen-spec.md`
- `docs/ja/learning/app-mvp-prototype-plan.md`
- `docs/ja/learning/app-mvp-formal-birds-review.md`

目的：

- 通常アプリ画面で正式4鳥を表示する。
- カード / 聞き比べ / クイズの3画面で、鳥・音・コード名・運指画像が結びつくか確認する。
- スマホ幅で鳥、コード名、運指画像、再生ボタンが見やすいようにする。
- クイズを「鳥当て」ではなく「音を聞いてコードと鳥を結びつける」構造にする。

状態：

- [x] 通常表示が `assets/approved/characters/` を参照
- [x] カード画面の鳥画像と運指画像の最大サイズを調整
- [x] 聞き比べ画面の鳥画像と運指画像に個別クラスを追加
- [x] クイズ選択肢を音再生後に有効化
- [x] 回答後の聞き直しで同じ問題を再回答できないように調整
- [x] `次の問題` ボタンを回答後だけ有効化
- [x] `?view=card/compare/quiz` で確認画面を直接開けるように調整
- [x] `sound_file_ready: false` の間はWeb Audio仮音源へ直行し、未作成音源の404を避ける
- [x] スマホ幅の画像サイズと余白を調整
- [x] 初回ユーザー目線で、カード / 聞き比べ / クイズの学習文言を微調整
- [x] 学習体験レビューを `docs/ja/learning/app-mvp-learning-experience-review.md` に記録
- [x] 確認メモを `docs/ja/learning/app-mvp-formal-birds-review.md` に追加

確認済み：

- `node --check app/main.js`
- `assets/app/data/initial-four-chords.json` のJSON構文確認
- `assets/app/data/initial-four-chords.formal-candidate-001.json` のJSON構文確認
- `http://localhost:8000/app/` のHTTP 200確認
- `assets/approved/characters/major.png` のHTTP 200確認
- Playwright Chromiumでカード / 聞き比べ / クイズ画面のPC幅・スマホ幅スクリーンショット確認
- Playwright Chromiumでクイズの再生前・再生後・回答後の状態を確認

注意：

- Browserプラグインの自動操作ツールがこの環境では露出していなかったため、今回はコード確認、HTTP確認、Playwright CLI確認を中心に実施。
- 実機スマホでのタップ感とWeb Audio音量は次確認に残す。

---

## Step 8: アプリMVPからLINE候補へ正式派生

使うファイル：

- `assets/approved/characters/`
- `tools/render_line_transparent_exports.swift`
- `assets/line/source/transparent/`
- `assets/line/export/stickers/`
- `docs/ja/stickers/app-mvp-line-derivative-export.md`
- `docs/ja/stickers/line-export-spec.md`
- `docs/ja/learning/app-to-sticker-asset-bridge.md`

目的：

- アプリMVPで使う正式4鳥をLINE候補へ流用する。
- 透明PNG化した鳥素材を土台に、コードネームを後載せする。
- LINE候補4個、メイン画像、タブ画像、レビュー用一覧を整理する。

状態：

- [x] `assets/approved/characters/` から通常LINE候補を再書き出し
- [x] 透明キャラクター素材を `assets/line/source/transparent/` に生成
- [x] スタンプ候補を `assets/line/export/stickers/` に生成
- [x] レビュー用一覧を `assets/line/review/app-mvp-derivative/` に作成
- [x] サイズ、RGBA、アルファチャンネル、容量を確認
- [x] 鳥面積を `C` 基準 `±10%` で確認
- [x] 小さく見えた `Cadd9` の鳥表示を拡大
- [x] 目サイズを `C` 基準 `±10%` で確認
- [x] `Cadd9` を目だけではなく鳥全体で気持ち小さく再調整
- [x] 透過エッジ確認用のチェッカー・濃色背景レビュー画像を作成
- [x] `C / Cm / C7` のコードネームを少し上げて下余白を11pxに調整
- [x] `Cadd9` の370 x 320実寸での文字視認性を確認
- [x] `Cadd9` を鳥全体でC比約5%小さく調整
- [x] 羽先端は元々のC基準へ揃える方針を維持
- [x] 羽先端ルールを「元々のCの小さな丸い2山の割れ」基準へ明確化
- [x] 見えている羽先だけ割れを入れ、見えない羽は無理に割らない方針を記録
- [x] タッチアップ指示書 `docs/ja/production/formal-bird-wingtip-touchup-guide.md` を作成
- [x] 非破壊の羽先端タッチアップ候補を `assets/touchups/wingtip-candidate-2026-05-22/` に作成
- [x] タッチアップ候補のLINE 370 x 320、96 x 74タブ、鳥面積、目サイズを確認
- [x] タッチアップ候補結果を `docs/ja/production/formal-bird-wingtip-touchup-result.md` に記録
- [x] ユーザー確認により、前回の割れ追加候補を不採用に変更
- [x] 追加割れ線を撤回し、正式4鳥元画像へ戻した候補を `assets/touchups/wingtip-revert-candidate-2026-05-22/` に作成
- [x] 羽先端は現段階で追加修正せず、`assets/approved/characters/` の正式素材維持で進める方針を確定
- [x] 次の制作対象をアプリMVP確認またはLINE派生確認へ戻す
- [x] 確認メモを `docs/ja/stickers/app-mvp-line-derivative-export.md` に追加

確認済み：

- スタンプ候補4個は `370 x 320`
- メイン画像は `240 x 240`
- タブ画像は `96 x 74`
- `185 x 160` は公式サイズではなく縮小参考画像
- すべてPNG/RGBA、アルファチャンネルあり
- 個別スタンプ候補はすべて1MB以下
- 透過エッジはチェッカー背景・濃色背景で大きな白残りや欠けなし
- `Cadd9` のコードネームは370 x 320実寸で可読性あり
- 鳥面積は `C / Cm / C7 / Cadd9` すべて `C` 比 `±10%` 以内
- 目サイズは `C / Cm / C7 / Cadd9` すべて `C` 比 `±10%` 以内
- `Cadd9` は鳥面積 `-4.8%`、目サイズ `+0.3%` に調整済み
- 追加割れ撤回候補でも、鳥面積と目サイズは基準内を維持
- `assets/approved/characters/` は上書きしない
- アプリMVPとLINE候補は、現行正式4鳥ベースで継続する

注意：

- これは本番LINE申請用の最終ファイルではない。
- 本番前に公式ガイドライン、透過エッジ、サウンド付きスタンプ要件を再確認する。
- 羽先端の追加割れ候補は、Cm / C7 / Cadd9 の品質理由で不採用。
- 羽先端は、現段階ではラスタ局所修正しない。
- 今後羽先を揃える場合は、ラスター線足しではなく、輪郭そのものを描き直す。
- 品質を保てない場合は、割れなし寄せの仕様へ切り替える。

---

## Step 9: Codoriロゴ初期ラフを確認

使うファイル：

- `docs/ja/core/logo-style-guide.md`
- `assets/logo/codori-logo-rough-04.svg`
- `assets/logo/codori-icon-rough-04.svg`
- `assets/logo/codori-logo-app-header-rough-04.svg`
- `assets/logo/README.md`

目的：

- Codoriのロゴ方向性を3案整理する。
- アプリ / LINE / SNS / グッズで使いやすい条件を決める。
- 文字ロゴ + 小鳥アイコンの初期SVG案を作る。
- Deep Blueと白鳥世界観を中心に、色数を増やしすぎない。

状態：

- [x] ロゴ方向性3案を整理
- [x] 初期本命を「文字ロゴ + 小鳥アイコン」に設定
- [x] 初期SVG案を `assets/logo/` に作成
- [x] 頭のハネと足の違和感を抑えたラフ02を作成
- [x] ラフ02の足が強いため、頭ハネを背面寄りにし足を小さくしたラフ03を作成
- [x] ロゴ用途では足を省略した方が安定するため、ラフ04を作成
- [x] rough-04を本命候補として記録し、現フェーズ決定へ進めた
- [x] アプリヘッダー用派生SVGを作成
- [x] アプリヘッダーへ仮反映
- [x] プレビュー画像を `assets/logo/review/` に作成
- [x] SVG構文とHTTP表示を確認
- [x] アプリヘッダー仮反映をPC幅・スマホ幅で確認
- [x] アイコン単体の128px / 96px / 64px / 48px縮小確認
- [x] rough-04を現フェーズのロゴとして固定
- [ ] 正式採用前に商標・類似ロゴ調査を行う

注意：

- これは正式ロゴではない。
- 既存4鳥の再デザインではない。
- 商標調査は未実施。
- 大量バリエーション生成はしない。

---

## Step 10: コード・キー展開ロードマップを作る

使うファイル：

- `docs/ja/learning/chord-key-expansion-roadmap.md`
- `docs/ja/learning/ukulele-chord-memory-system.md`
- `docs/ja/learning/app-mvp-screen-spec.md`

目的：

- 初期4コードの次に追加するコードを決める。
- 新キャラ追加ではなく、既存4鳥のキー展開を優先する。
- ウクレレ初心者が曲で使いやすい順にする。
- ダイアトニックコードを早めに扱い、コード進行の感じを覚えられるようにする。
- アプリMVPを壊さず、別セットとして追加できる構造にする。

状態：

- [x] rough-04ロゴは現フェーズ決定として扱う
- [x] 次の展開は新鳥種より既存4鳥のキー展開を優先
- [x] Expansion Set 01を定義
- [x] 必要な運指SVG、音源、データ項目を整理
- [x] Expansion Set 01はまずダイアトニック入門コードから作る
- [x] `F / G / Am / Dm / Em / G7` の運指SVGを作る
- [x] `expansion-set-01.json` 候補を作る
- [x] ダイアトニック入門コードの確認シートを作る
- [x] Cメジャー周辺のダイアトニックを早めに扱う方針を追加
- [x] `Em` を追加して `C / Dm / Em / F / G / Am` の6コードを揃える
- [x] セット選択UIを追加して、初期4コードとExpansion Set 01を切り替え確認する
- [x] カード / 聞き比べ / 音あてをセット単位で動作確認する
- [x] PC幅・スマホ幅の確認画像を作成する
- [x] コード種類と鳥種対応の固定部分・暫定部分を整理する
- [x] 次の拡張判断レビューを作成する
- [x] A7 / D7追加前の学習意味と必要データを整理する
- [x] A7 / D7の運指SVGを追加する
- [x] `expansion-set-01.json` にA7 / D7を追加する
- [x] `A7 -> Dm`、`D7 -> G`、`G7 -> C` の道しるべをアプリ画面に反映する
- [x] D7主表示を初心者向けの`2020`に決定する
- [x] 次のコード種類としてm7を選ぶ
- [x] m7仮キャラクターSVGを追加する
- [x] `Am7 / Dm7 / Em7` の運指SVGを追加する
- [x] `m7-set-01.json` を追加する
- [x] アプリに `m7の夜` セットを追加する
- [x] 鳥種対応表の正式候補を記録する
- [x] 鳥種を正式に広げるタイミングを明記する
- [x] `m7 / 夜雀` の正式候補用画像生成プロンプト8案を作成する
- [x] `m7 / 夜雀` の初回候補画像を生成し、候補Bを本命として記録する
- [x] `m7 / 夜雀` 案をボツにし、本番方針を白い鳥アクション方式へ変更する
- [x] 白い鳥アクション差分の制作ブリーフを作成する
- [x] 初期4コードの確定内容を白い鳥アクション差分へ変換して記録する
- [x] 初期4コードの白い鳥アクション確認シートv1を生成し、レビューを記録する
- [x] 初期4コードの白い鳥アクション確認シートv2を生成し、正式候補ベースとして記録する
- [x] LINE前に他コードの白い鳥アクションを完成させる計画を作成する
- [x] m7 / maj7 / mM7 / sus4の白い鳥アクション確認シートv2を生成し、レビューを記録する
- [x] m7-5 / dim / augの白い鳥アクション確認シートv2を生成し、レビューを記録する
- [x] 11種類の白い鳥アクションをレビュー用に単体化し、96px確認を記録する
- [x] `?actions=1`で白い鳥アクション候補をアプリ表示できるようにする
- [x] v7白い鳥アクション候補を作成し、アプリとオンライン確認へ反映する
- [x] ポーズだけでは伝わりにくいため、ワンポイント補助設計へ方針変更する
- [x] ワンポイントだけの白黒ラフ表を作る
- [x] 11コード種類のワンポイント形状を初期案として固定する
- [x] v7ポーズにワンポイントを足したv8候補をアプリ上で重ねる
- [ ] v8候補を96px縮小とアプリ表示で最終確認する
- [x] 音あて補助音を`土台をきく`/`基準をきく`の自動切替にする
- [x] 全コードカタログへmM7を追加し、12音 x 主要11種類 = 132コードへ更新する
- [x] mM7フィルタとCmM7直接検索をアプリで確認する
- [x] mM7の眉線なし候補v6を作成し、アプリ確認用画像へ反映する
- [x] ユーザー判断により、mM7のアプリ確認用画像をv5へ差し戻す

判断：

```text
Expansion Set 01:
F / G / Am / Dm / Em / G7 / A7 / D7

ダイアトニック入門:
C / Dm / Em / F / G / Am

帰り道の案内役:
G7

7鳥の道しるべ:
A7 -> Dm
D7 -> G
G7 -> C

m7入門:
Am7 / Dm7 / Em7
```

追加準備済み：

```text
assets/app/data/expansion-set-01.json
assets/app/fingering/expansion-set-01/
assets/app/review/expansion-set-01/fingering-expansion-set-01-review.html
assets/app/review/expansion-set-01/fingering-expansion-set-01-review.png
assets/app/review/expansion-set-01/fingering-expansion-set-01-review-mobile.png
assets/app/review/mvp-current-2026-05-22/desktop-initial-set-card.png
assets/app/review/mvp-current-2026-05-22/desktop-expansion-set-card.png
assets/app/review/mvp-current-2026-05-22/mobile-expansion-set-compare.png
assets/app/review/mvp-current-2026-05-22/desktop-expansion-set-quiz.png
assets/app/review/mvp-current-2026-05-22/mobile-expansion-set-quiz.png
docs/ja/core/chord-family-bird-mapping-policy.md
docs/ja/learning/next-expansion-decision-review.md
docs/ja/learning/a7-d7-expansion-prep.md
docs/ja/learning/a7-d7-app-integration-review.md
docs/ja/learning/m7-app-integration-review.md
docs/ja/characters/m7-night-sparrow-generation-prompts.md
docs/ja/characters/m7-night-sparrow-formal-candidate-review.md
docs/ja/core/white-bird-action-system.md
docs/ja/characters/white-bird-action-production-brief.md
docs/ja/characters/initial-four-white-bird-action-decision.md
docs/ja/characters/initial-four-white-bird-action-review.md
docs/ja/characters/remaining-white-bird-action-review.md
docs/ja/characters/white-bird-action-single-review.md
docs/ja/characters/pre-line-chord-action-completion-plan.md
assets/app/review/initial-four-white-bird-actions-2026-05-27/
assets/app/review/remaining-white-bird-actions-2026-05-27/
assets/app/review/white-bird-action-singles-2026-05-27/
assets/app/characters/action-candidate-old-c-v6b/
assets/app/review/mm7-app-2026-05-28/
assets/app/review/old-c-action-redesign-2026-05-28/
```

注意：

- 初期4コードMVPは上書きしない。
- 追加コードは、セット選択UIから表示できるようにする。
- `C / Dm / Em / F / G / Am` はCメジャー周辺のダイアトニック入門として扱う。
- `G7` は `C` へ帰る案内役として残す。
- `A7 / D7 / G7` は7鳥の「次へ案内する」役割を覚える道しるべとして扱う。
- `D7` の主表示は`2020`。`2223`は将来の比較候補として残す。
- `コード種類 = 鳥種` は撤回する。
- 本番では元の白い鳥を使い、コード種類は白い鳥のアクション違いと小さなワンポイントで表す。
- キー違いは、同じアクション、同じワンポイント形状の色違いで表す。
- 旧鳥種案は過去検討として残すが、本番正本にはしない。
- 現時点では、Cを重複表示しないまま文言で補助し、`A7 / D7` で既存7鳥のキー展開を進めた。
- `A7 -> Dm`、`D7 -> G`、`G7 -> C` の流れを7鳥の「次へ進ませる」学習体験として扱う。
- `Bdim` はdim / m7-5系の鳥種設計が必要なため、初期では急がない。
- `m7 / 夜雀` 案はボツ。今後は元の白い鳥の「夜にほどけるアクション」として再設計する。
- 12音 x 主要11種類の全主要コード生成カタログは追加済み。
- ただし、全主要コード生成カタログは正式教材完成版ではなく、運指確認前の全体確認用として扱う。
- 音源制作はまだ行わず、Web Audio仮音源を使う。

---

# 今はまだ作らないもの

以下は、アプリMVP設計後でよい。

- `docs/ja/stickers/line-sticker-pack01-plan.md`
- `docs/ja/stickers/line-sticker-prompt-pack01.md`
- `docs/ja/stickers/line-sticker-review-checklist.md`
- 12キー全展開の正式教材化
- 正式版の全コード図鑑
- ジャズ寄りダイアトニックコードセット
- サウンド付きLINEスタンプ本番申請資料
- ロゴの大量バリエーション
- 商標調査資料
- 新しい鳥種の大量追加
- m7夜雀、maj7白鳥、mM7黒鳥などの別鳥種化
- 全コード運指の正式採用判断

理由：

- Codoriの主軸はウクレレコード記憶アプリであり、先にMVP学習体験を固める必要があるため。
- 16個以上のスタンプ設計は、アプリ素材の基準が固まった後でよいため。

---

# 未決事項

- 実機スマホでタップしやすいか。
- Web Audio仮音源の音量が大きすぎないか。
- 初期4コードの仮音源をWeb Audioから音声ファイルへ切り替える時期。
- 正解/不正解用の表情差分を今後作るか。
- メイン画像とタブ画像をMajor単体で進めるか。
- 縮小参考画像をどの環境で最終目視確認するか。
- Codoriロゴrough-04は現フェーズ決定済み。正式採用前にどの範囲まで商標・類似確認するか。
- アプリアイコンは小鳥単体を現フェーズ決定済み。正式時に音の粒を添えるか。
- `Bdim` をdim鳥で扱うか、m7-5系と統合するか。
- ジャズ寄りダイアトニックを `m7 / maj7 / m7-5` のどの順で解禁するか。
- D7の`2223`をいつ比較表示するか。
- A7 / D7の次にE7を入れるか。
- `D7` と `Em` の標準フォームをどこまで初心者向けに補足するか。
- m7は、白い鳥の「夜にほどけるアクション」として再設計する。
- `mM7` は、白い鳥の「宿命を見つめるアクション」として扱う。黒鳥にはしない。
- `m7 / maj7 / mM7 / sus4 / m7-5 / dim / aug` はv2確認済み。正式化前にmM7の眉のような線を弱める。
- 12キー色の初期案を、実際のアプリ表示とLINEサイズでどこまで調整するか。
