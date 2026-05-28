# Codori App Data

このフォルダは、Codoriウクレレコード記憶アプリで使うデータを置く場所です。

## 初期4コードデータ

```text
initial-four-chords.json
initial-four-chords.formal-candidate-001.json
```

対象：

```text
C
Cm
C7
Cadd9
```

## 追加準備データ

```text
expansion-set-01.json
m7-set-01.json
all-main-chords.json
practice-stages.json
```

対象：

```text
F
G
Am
Dm
Em
G7
A7
D7
```

注意：

- 初期4コードMVPにはまだ混ぜません。
- `F / G / Am / Dm / Em / G7 / A7 / D7` はExpansion Set 01の学習コードです。
- `C / Dm / Em / F / G / Am` がCメジャー周辺の6コード、`G7` はCへ帰る案内役です。
- `A7 / D7` は既存7アクションのキー展開で、`A7 -> Dm`、`D7 -> G`、`G7 -> C` の流れを覚えるために追加します。
- D7の主表示は、初心者が押さえやすい`2020`を採用します。`2223`は将来の比較候補として`alternate_fingering`に残します。
- キャラクター画像は既存4鳥を使い回します。
- 運指画像は `assets/app/fingering/expansion-set-01/` を参照します。

## m7入門データ

対象：

```text
Am7
Dm7
Em7
```

注意：

- `m7-set-01.json` は、新しいコード種類 `m7` の最初の確認用データです。
- m7アクションは正式画像生成前のため、元の白い鳥 `assets/approved/characters/major.png` を使います。
- 正式m7アクションが採用されたら、`character_asset` を正式素材へ差し替えます。
- 運指画像は `assets/app/fingering/m7-set-01/` を参照します。

## 全主要コードカタログ

対象：

```text
12音 x 主要11コード種類 = 132コード
```

コード種類：

```text
Major
minor
7
add9
m7
maj7
mM7
sus4
m7-5
dim
aug
```

注意：

- `all-main-chords.json` は、全体像をアプリで確認するための生成カタログです。
- 運指SVGは `assets/app/fingering/all-main-chords/` を参照します。
- コード種類はすべて元の白い鳥を使い、`?actions=1`では白い鳥アクション候補へ差し替えて確認します。
- 自動生成した運指は教材として固定する前に人間が確認します。
- Sixth、11th、13thなどは現段階の全主要コードカタログには含めません。

## 練習ステージデータ

対象：

```text
Stage 0
Stage 1
Stage 2
Stage 3
Stage 4
Stage 5
Stage 6
Stage 7
Stage 8
Stage 9
Stage 10
```

注意：

- `practice-stages.json` は、図鑑用コードデータとは別に、練習モードのステージ構成を管理します。
- コード本体は重複定義せず、`initial-four-chords.json`、`expansion-set-01.json`、`m7-set-01.json`、`all-main-chords.json` のコードを参照します。
- 進行練習では、`progressions` の `code_ids` を順番に並べて表示します。
- Stage 0〜10は選択可能です。
- Stage 10は全132コードを一度に出題する場所ではなく、全コード図鑑の使い方をCの11種類で確認する入口です。

## 注意

- `Cadd9` の運指 `0203` は初期MVP用に採用済みです。
- `character_asset` は `assets/approved/characters/*.png` の正式参照名を使います。
- 白い鳥アクション候補の検証中は、`?actions=1`で `assets/app/characters/action-candidate-2026-05-27/` の候補素材を使います。
- `initial-four-chords.formal-candidate-001.json` は正式4鳥候補001の比較確認用です。
- 2026-05-22時点で、正式4鳥候補001は `assets/approved/characters/` に反映済みです。
- 比較確認用画像は `assets/app/characters/formal-candidate-001/` にも残します。
- `memory_hint` はカード画面の覚え方メモに使います。
- `temp_audio_notes` はWeb Audio仮音源に使う周波数配列です。
- `sound_file` は将来の音声ファイル参照です。
- `sound_file_ready` が `true` の場合だけ、`sound_file` の音声を優先します。
- `sound_file_ready` が `false` の場合は、`temp_audio_notes` の仮音源を鳴らします。
- 弦表示は `vertical`、チューニングは `GCEA` を暫定前提にしています。
