# Codori A7 / D7 追加記録

## このファイルについて

このファイルは、Expansion Set 01に `A7 / D7` を追加した判断と実装内容を記録するメモです。

目的は、既存7鳥のキー展開として、7鳥の「次へ案内する」役割を学習体験に入れること。

---

# 追加する理由

`A7 / D7` は、既存の7鳥を使ったキー展開として追加する。

新しい鳥種は増やさない。

```text
A7 = 7鳥 + A表示 + A7運指
D7 = 7鳥 + D表示 + D7運指
```

学習上の狙いは、7鳥の役割を強くすること。

```text
7鳥 = 次へ進ませる鳥
```

---

# Codoriらしい進行の言葉

## A7 -> Dm

```text
A7は、Dmの静かな小道へ背中を押す風。
```

感情：

- そわっとする
- minorの静けさへ向かう
- まだ止まらない

## D7 -> G

```text
D7は、Gの前向きな風へ走り出す合図。
```

感情：

- 少し得意げ
- 次の明るさへ向かう
- 足取りが軽くなる

## G7 -> C

```text
G7は、Cへ帰りたくなる帰り道の合図。
```

感情：

- 帰りたい
- まとまりたい
- ほっとする場所へ向かう

---

# 追加後に見せたい流れ

最初に扱う流れ：

```text
A7 -> Dm
D7 -> G
G7 -> C
```

少し発展した流れ：

```text
A7 -> Dm -> G7 -> C
D7 -> G -> C
A7 -> D7 -> G7 -> C
```

初心者向けには、理論名よりも以下を優先する。

```text
7鳥が出てきたら、次の場所へ向かう
```

---

# 必要な運指SVG

追加候補：

| コード | 候補運指 | メモ |
|---|---|---|
| A7 | 0100 | 初心者向け。押さえる場所が少ない |
| D7 | 2020 | 初心者向け主表示。押さえやすさを優先 |
| D7 | 2223 | 将来の比較候補。しっかりD7感を出すフォーム |

D7の判断：

- アプリ主表示は`2020`を採用する
- 理由は、初心者が押さえやすく、7鳥の「次へ行く感じ」を先に体験しやすいため
- `2223`は、将来のフォーム比較や「しっかり押さえるD7」として残す

保存先案：

```text
assets/app/fingering/expansion-set-01/ukulele_A7_vertical_strings.svg
assets/app/fingering/expansion-set-01/ukulele_D7_vertical_strings.svg
```

---

# 必要なデータ項目

`assets/app/data/expansion-set-01.json` に追加する場合の項目。

## A7

```text
code_id: A_7
display_name: A7
root: A
family: 7
ukulele_fingering: 0100
fingering_asset: assets/app/fingering/expansion-set-01/ukulele_A7_vertical_strings.svg
sound_file: assets/sound/source/codori_sound_11_A7_ukulele.wav
sound_file_ready: false
character_asset: assets/approved/characters/seventh.png
key_accent: A
learning_note: Dmへそっと背中を押す
memory_hint: A7は、Dmの静かな小道へ背中を押す風。7鳥のそわっとした動きで、次へ向かう感じを覚えよう。
expansion_set: expansion-set-01
difficulty: beginner
```

## D7

```text
code_id: D_7
display_name: D7
root: D
family: 7
ukulele_fingering: 2020
alternate_fingering: 2223
fingering_asset: assets/app/fingering/expansion-set-01/ukulele_D7_vertical_strings.svg
sound_file: assets/sound/source/codori_sound_12_D7_ukulele.wav
sound_file_ready: false
character_asset: assets/approved/characters/seventh.png
key_accent: D
learning_note: Gへ走り出す合図
memory_hint: D7は、Gの前向きな風へ走り出す合図。まずは押さえやすい2020で、7鳥が次へ案内する感じを覚えよう。
expansion_set: expansion-set-01
difficulty: beginner
```

`temp_audio_notes` は、実装時にWeb Audio仮音源として追加する。

---

# 鳥種正式化との関係

`A7 / D7` は、正式鳥種対応表を確定する前でも進められる。

理由：

- 既存の7鳥を使い回せる
- まだ新コード種類を増やさない
- 学習目的が「7鳥の役割強化」なので、現行MVP素材で検証できる

鳥種対応表を正式化するタイミング：

```text
A7 / D7 を追加して7鳥のキー展開を確認
↓
m7 / maj7 / sus4 など新コード種類の画像制作に入る直前
```

---

# 実装済みの作業範囲

実施済み：

- A7 / D7 の運指SVGを追加
- `expansion-set-01.json` にA7 / D7を追加
- `A7 -> Dm`、`D7 -> G`、`G7 -> C` の言葉を画面に反映
- D7主表示を`2020`に決定
- `2223`を`alternate_fingering`として記録

やらないこと：

- 新キャラ追加
- m7 / maj7鳥の画像生成
- Bdim追加
- 12キー展開
- 音源制作
- LINEスタンプ量産

---

# 未決事項

- D7の`2223`を、いつ学習画面で比較表示するか。
- A7 / D7の次にE7を入れるか。
- 画面上にコード進行ミニ表示を追加するか。
