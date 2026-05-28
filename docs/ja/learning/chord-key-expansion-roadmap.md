# Codori コード・キー展開 最小ロードマップ

## このファイルについて

このファイルは、初期4コード `C / Cm / C7 / Cadd9` の次に、
Codoriアプリへ追加するコードとキー展開を整理するためのロードマップです。

目的は、12キー全展開や新キャラ大量追加へ急がず、
ウクレレ初心者が実際に使いやすい順で、学習体験を少しずつ広げることです。

トレーニング全体の方針は以下を正とする。

```text
docs/ja/learning/chord-training-policy.md
```

ステージ制の展開は以下を正とする。

```text
docs/ja/learning/training-stage-roadmap.md
```

---

# 現在の完了範囲

完了済み：

```text
C
Cm
C7
Cadd9
```

使う鳥：

```text
Major鳥
minor鳥
7鳥
add9鳥
```

現在の学習目的：

```text
同じCを基準に、コード種類の違いを鳥・音・運指で覚える。
```

---

# 展開の基本ルール

今後も以下を守る。

```text
コード種類 = 鳥種
キー / ルート = コード名、運指画像、キー色
フォーム = 運指画像
テンション = 小さなアクセサリ
```

重要：

- `C` と `F` で鳥種、表情、基本ポーズは変えない
- `C` と `Cm` では鳥種と表情を変える
- `C` と `C7` でも鳥種と表情を変える
- `C` と `Cadd9` でも鳥種と表情を変える
- キー違いは、キー色、コードネーム、運指画像を主役にする

つまり、

```text
C  = Major鳥 + C表示 + C運指
F  = Major鳥 + F表示 + F運指
G  = Major鳥 + G表示 + G運指

Cm = minor鳥 + Cm表示 + Cm運指
Am = minor鳥 + Am表示 + Am運指
Dm = minor鳥 + Dm表示 + Dm運指

C7 = 7鳥 + C7表示 + C7運指
G7 = 7鳥 + G7表示 + G7運指
A7 = 7鳥 + A7表示 + A7運指
```

---

# 次に追加するコード種類

## 直近では新しい鳥種を増やさない

2026-05-23までは、まず新しいコード種類よりも、
既存の `Major / minor / 7` を実用的なキーへ広げる。

理由：

- 初心者が曲で使うコードを早く増やせる
- 既存4鳥の学習ルールが定着する
- 新キャラ追加による混乱を避けられる
- 運指画像と音の追加だけでアプリ価値が上がる

## 次に増やす新しいコード種類候補

既存ファミリーのキー展開後に、以下を検討する。

| 優先 | コード種類 | 例 | 理由 |
|---|---|---|---|
| 1 | sus4 | Csus4, Gsus4 | 「待って戻る」感が直感的で、Major / 7と比較しやすい |
| 2 | m7 | Am7, Dm7 | ウクレレで押さえやすく、やさしい響きとして使いやすい |
| 3 | maj7 | Cmaj7, Fmaj7 | おしゃれで穏やかな響き。少し後でもよい |
| 4 | m7-5 | Bm7-5 など | キャラ性は強いが、初心者の最初の曲では優先度低め |

2026-05-23時点の判断：

```text
Major / minor / 7 のキー展開を進めたため、
次の新しいコード種類として m7 をアプリに仮実装する。
```

---

# 次に追加するキー・コード

## Expansion Set 01: 初心者頻出コード

最初の追加セットは、初心者が曲でよく使うコードを優先する。
あわせて、Cメジャー周辺のダイアトニックコードを早めに体験できる構成にする。

追加候補：

| 表示名 | family | root | 仮運指 | 使う鳥 | 学習メモ |
|---|---|---|---|---|---|
| F | Major | F | 2010 | Major鳥 | Cとは違う場所に着地する明るさ |
| G | Major | G | 0232 | Major鳥 | 少し前へ進む明るさ |
| Am | minor | A | 2000 | minor鳥 | やさしく内向きな暗さ |
| Dm | minor | D | 2210 | minor鳥 | しっとりした深さ |
| Em | minor | E | 0432 | minor鳥 | 静かに沈む感じ |
| G7 | 7 | G | 0212 | 7鳥 | Cへ戻りたくなる動き |
| A7 | 7 | A | 0100 | 7鳥 | Dmへ進みたくなる動き |
| D7 | 7 | D | 2020 | 7鳥 | Gへ進みたくなる動き |

実装順：

```text
F / G / Am / Dm / Em / G7
↓
A7 / D7（2026-05-23追加）
```

理由：

- `C / F / G / Am` だけで弾ける曲が増える
- `Dm / G7 / C` でコード進行の流れを覚えやすい
- `A7 / D7 / G7 / C` で「7鳥 = 次へ行きたくなる」が体感できる

## ダイアトニック導入方針

Codoriでは、コード単体の暗記だけでなく、
曲の中でコードがどう並ぶかも早めに扱う。

最初に扱うダイアトニックは、Cメジャー周辺を基本にする。

| 度数 | コード | 使う鳥 | 学習上の印象 |
|---|---|---|---|
| I | C | Major鳥 | ほっと帰れる場所 |
| ii | Dm | minor鳥 | 少し静かな通り道 |
| iii | Em | minor鳥 | そっと影が差す場所 |
| IV | F | Major鳥 | やわらかく広がる場所 |
| V | G | Major鳥 | 前へ進む風 |
| vi | Am | minor鳥 | やさしく胸にしまう場所 |
| vii° | Bdim | 将来のdim / m7-5系 | まだ不安定で、初期では急がない |

初期導入では、`Bdim` はまだ扱わない。
理由は、新しい鳥種が必要になりやすく、初心者の最初の曲では使用頻度も低いため。

まずは以下を「Cメジャーの6羽」として覚える。

```text
C / Dm / Em / F / G / Am
```

さらに、実際の曲では `G7 -> C` の帰る感じが大切なので、
`G7` はダイアトニック入門の案内役として早めに入れる。

```text
G7 -> C = 帰り道の合図
```

この方針により、Expansion Set 01は単なる追加コードではなく、
「Cのまわりを飛ぶ最初のコードの森」として扱う。

## 将来: ジャズ寄りダイアトニック

基本のダイアトニックに慣れた後で、
ジャズ寄りの7thダイアトニックも扱う。

ただし初期では急がない。
理由は、`m7`、`maj7`、`m7-5` など新しい鳥種が必要になり、
初心者向けの最初の学習には情報量が増えすぎるため。

将来のCメジャー7thダイアトニック候補：

| 度数 | コード | 必要な鳥種 | 学習上の印象 |
|---|---|---|---|
| Imaj7 | Cmaj7 | maj7鳥 | ほっとするけど少し大人っぽい |
| iim7 | Dm7 | m7鳥 | やさしく静かに流れる |
| iiim7 | Em7 | m7鳥 | 影が薄く、やわらかい |
| IVmaj7 | Fmaj7 | maj7鳥 | 広がりがあっておしゃれ |
| V7 | G7 | 7鳥 | Cへ帰る合図 |
| vim7 | Am7 | m7鳥 | あたたかく内側に沈む |
| viim7-5 | Bm7-5 | m7-5鳥 | 不安定で、次へ流れたがる |

扱う順番のおすすめ：

```text
m7
↓
maj7
↓
m7-5
```

ジャズ寄りダイアトニックは、
「最初の森」ではなく「夜の森」「おしゃれな小道」のような後続エリアとして扱う。

## m7入門セット

2026-05-23時点で、次の新しいコード種類として`m7`をアプリへ仮実装する。

対象：

```text
Am7
Dm7
Em7
```

使う鳥：

```text
m7鳥 = 夜雀
```

現時点では正式画像生成前のため、アプリ確認用の仮SVGを使う。

```text
assets/app/characters/provisional/m7-night-sparrow.svg
```

学習上の狙い：

- minorより少しほどける感じを覚える
- 余韻が長く、夜っぽい響きを覚える
- 将来のジャズ寄りダイアトニックへ進む入口にする

## 全主要コードカタログ

2026-05-23時点で、全体像を早めに見られるように、
12音 x 主要11コード種類の生成カタログをアプリへ追加する。

対象：

```text
12音 x 11種類 = 132コード
```

含めるコード種類：

```text
Major
minor
7
add9
m7
maj7
sus4
m7-5
dim
aug
```

含めないもの：

```text
Sixth
11th
13th
altered
分数コード
複数フォーム比較
```

理由：

- まずCodoriの鳥種対応を大きく見渡すため
- 12音のキー展開ルールをアプリ上で確認するため
- 正式画像生成や音源制作の前に、データ構造を固めるため
- 量産ではなく、図鑑化・検索・復習の土台にするため

注意：

- Major / minor / 7 / add9 は正式4鳥素材を使う
- m7 / maj7 / sus4 / m7-5 / dim / aug は仮SVGを使う
- キー違いで鳥種、表情、基本ポーズは変えない
- 自動生成した運指は正式教材化前に人間が確認する
- 音源はWeb Audio仮音源を使い、音声ファイル制作は後回しにする

アプリ上の表示名：

```text
全コード
```

統合レビュー：

```text
docs/ja/learning/all-main-chords-generation-review.md
```

## ダイアトニック入門コードの追加準備

2026-05-23時点で、Expansion Set 01はCメジャー周辺の6コードと、
7鳥の道しるべ `G7 / A7 / D7` までアプリへ統合済み。

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

準備済み：

- 追加データ: `assets/app/data/expansion-set-01.json`
- 運指SVG: `assets/app/fingering/expansion-set-01/`
- 運指確認シート: `assets/app/review/expansion-set-01/fingering-expansion-set-01-review.html`

7鳥の道しるべ：

```text
A7 -> Dm
D7 -> G
G7 -> C
```

D7の主表示は、初心者向けに`2020`を採用する。
`2223`は将来のフォーム比較候補として残す。

アプリ本体への反映方針：

- 初期4コードのデータは上書きしない
- セット選択UIで、必要なときだけExpansion Set 01を表示する
- 使う鳥種と表情は既存の `Major / minor / 7` を継続する
- キー違いはキー色、コード名、運指SVGで表す
- `C / Dm / Em / F / G / Am` をダイアトニック入門として扱う
- `G7` は `C` へ帰る案内役として残す
- `A7 / D7 / G7` は7鳥の道しるべとして扱う
- `A7 -> Dm`、`D7 -> G`、`G7 -> C` を画面文言に入れる

アプリ上の表示名：

```text
はじめの4羽
Cのまわり
```

統合レビュー：

```text
docs/ja/learning/app-expansion-set-01-integration-review.md
```

次の拡張判断レビュー：

```text
docs/ja/learning/next-expansion-decision-review.md
```

A7 / D7追加記録：

```text
docs/ja/learning/a7-d7-expansion-prep.md
```

A7 / D7統合レビュー：

```text
docs/ja/learning/a7-d7-app-integration-review.md
```

現時点の推奨：

- CをExpansion Set 01に重複表示しないまま、文言で補助する
- A7 / D7で既存7鳥のキー展開を確認する
- 次に進む場合は、m7 / maj7 / sus4など新鳥種の正式設計判断へ進む

鳥種対応表を正式化するタイミング：

```text
A7 / D7 の既存7鳥キー展開を確認した後。
m7 / maj7 / sus4 など新コード種類の画像制作に入る直前。
```

---

# Expansion Set 02: Cキー周辺を少し広げる

Set 01のあと、必要に応じて以下を追加する。

| 表示名 | family | root | 仮運指 | 使う鳥 | 学習メモ |
|---|---|---|---|---|---|
| D | Major | D | 2220 | Major鳥 | 少し明るく前へ出る |
| A | Major | A | 2100 | Major鳥 | 軽く開けた明るさ |
| E7 | 7 | E | 1202 | 7鳥 | Amへ向かう動き |
| Fadd9 | add9 | F | 0010 | add9鳥 | Fに空気を足す |
| Gadd9 | add9 | G | 未確定 | add9鳥 | Gに広がりを足す |

注意：

- `D` は初心者にも出るが、押さえ方が少し窮屈なのでSet 01の後にする
- `E7` はAmへ向かう進行で役立つ
- add9のキー展開は、学習よりも雰囲気・図鑑性が強くなるため急がない
- `Gadd9` の仮運指は、学習アプリに入れる前に確認する

---

# Expansion Set 03: 新しい鳥種の検討

キー展開がある程度使えるようになったら、新しい鳥種を増やす。

おすすめ順：

```text
sus4
↓
m7
↓
maj7
↓
m7-5
```

理由：

- `sus4` は感情がわかりやすい
- `m7` はウクレレで押さえやすく、実用性が高い
- `maj7` はおしゃれだが初心者の最初ではなくてよい
- `m7-5` はキャラとして面白いが、初期学習では急がない

---

# アプリMVPを壊さない追加順

## 1. データだけ追加する

まずJSON候補を別ファイルで作る。

```text
assets/app/data/expansion-set-01.json
```

最初から `initial-four-chords.json` に混ぜない。

理由：

- 初期4コードMVPを壊さない
- 新しい運指や音の確認が終わるまで切り替えやすい
- アプリに「セット選択」を追加しやすい

## 2. 運指SVGを追加する

保存先案：

```text
assets/app/fingering/expansion-set-01/
```

命名案：

```text
ukulele_F_vertical_strings.svg
ukulele_G_vertical_strings.svg
ukulele_Am_vertical_strings.svg
ukulele_Dm_vertical_strings.svg
ukulele_Em_vertical_strings.svg
ukulele_G7_vertical_strings.svg
ukulele_A7_vertical_strings.svg
ukulele_D7_vertical_strings.svg
```

## 3. 音はWeb Audio仮音源で追加する

音声ファイル制作は後回し。

データには以下を持たせる。

```text
temp_audio_notes
sound_file
sound_file_ready: false
```

## 4. UIはセット選択だけ追加する

最初のUI追加は、図鑑化ではなくセット切り替えにする。

例：

```text
初期4コード
初心者セット01
```

避けること：

- 初期MVPの学習入口を、いきなり全コード一覧だけにする
- 12キー全展開を入れる
- コード検索やお気に入りなどを先に作る

補足：

2026-05-23時点では、初期学習入口とは別に、
全体確認用の生成カタログとして`全コード`セットを追加済み。
これは初回ユーザーの入口ではなく、制作・確認・図鑑化の土台として扱う。

トレーニングでは、`全コード`の検索結果をそのまま初心者練習セットにしない。
練習セットは3〜6コード程度に絞り、音、運指、感情、コード進行を結びつける。

## 5. クイズはセット単位で出す

Expansion Set 01を入れたら、クイズもセット単位で出題する。

```text
初期4コードクイズ
初心者セット01クイズ
```

いきなり全混ぜにしない。

---

# 必要な画像・運指SVG・音源・データ

## キャラクター画像

追加制作は不要。

使い回す：

```text
assets/approved/characters/major.png
assets/approved/characters/minor.png
assets/approved/characters/seventh.png
assets/approved/characters/add9.png
```

キー違いで鳥種、表情、基本ポーズは変えない。
キー違いは色で表す。

## キー色

キー違いは、同じ鳥の色違いとして扱う。

アプリ側で以下を表示する。

- コードネーム
- 小さなrootタグ
- 頬、羽先、胸元の淡い影、頭上ハネなどの淡いキー色

注意：

- 別キャラに見えるほど強く塗り替えない
- コードネーム文字色は原則Deep Blue
- LINE派生時も、まずコード名の視認性を優先する

## 運指SVG

ダイアトニック入門コードは準備済み。

```text
F
G
Am
Dm
Em
G7
```

保存先：

```text
assets/app/fingering/expansion-set-01/
```

後続候補：

```text
A7
D7
```

## 音源

当面はWeb Audio仮音源。

将来的な音声ファイル名案：

```text
codori_sound_05_F_ukulele.wav
codori_sound_06_G_ukulele.wav
codori_sound_07_Am_ukulele.wav
codori_sound_08_Dm_ukulele.wav
codori_sound_09_G7_ukulele.wav
```

後続候補の音声ファイル名は、追加順を決めてから採番する。

```text
codori_sound_10_Em_ukulele.wav
codori_sound_11_A7_ukulele.wav
codori_sound_12_D7_ukulele.wav
```

## データ項目

Expansion Set 01では以下を持つ。

| フィールド | 用途 |
|---|---|
| code_id | 内部ID |
| display_name | 表示コード名 |
| root | 音名 |
| family | Major / minor / 7 / add9 |
| ukulele_fingering | フレット番号 |
| fingering_asset | 運指SVG |
| string_direction | vertical固定 |
| character_asset | 使う鳥画像 |
| key_accent | root表示 |
| learning_note | 短い感情メモ |
| memory_hint | 覚え方 |
| temp_audio_notes | Web Audio仮音源 |
| sound_file | 将来の音声ファイル |
| sound_file_ready | 初期はfalse |
| expansion_set | expansion-set-01 |
| difficulty | beginner |

---

# 現時点の判断

```text
次に増やすのは新キャラではなく、既存4鳥のキー展開。
Expansion Set 01は F / G / Am / Dm / Em / G7 / A7 / D7。
A7 / D7は2026-05-23に既存7鳥のキー展開として追加済み。
C / Dm / Em / F / G / Am をダイアトニック入門、A7 / D7 / G7を7鳥の道しるべとして扱う。
```

---

# 未決事項

- `D7` の標準形 `2223` を、いつ比較フォームとして見せるか。
- `Em` は `0432` を採用するか、別フォームも併記するか。
- キーアクセント色をrootごとに持つか、まず文字タグだけにするか。
- `Bdim` をdim鳥で扱うか、m7-5系と統合して後で扱うか。
- A7 / D7の次にE7を入れるか。
