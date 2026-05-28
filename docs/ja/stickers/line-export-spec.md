# Codori LINE書き出し仕様

## このファイルについて

このファイルは、CodoriスタンプをLINE Creators Market向けに書き出すための仕様メモです。

仕様は変更される可能性があるため、本番提出直前に公式ガイドラインを再確認する。
2026-05-22時点では、以下のサイズを確認済み。

公式ガイドライン：

```text
https://creator.line.me/ja/guideline/sticker/
```

---

# 公式サイズ

| 種類 | 必要数 | サイズ |
|---|---:|---|
| メイン画像 | 1個 | 横240px × 縦240px |
| スタンプ画像 | 8個 / 16個 / 24個 / 32個 / 40個 | 横370px × 縦320px以内 |
| トークルームタブ画像 | 1個 | 横96px × 縦74px |

注意：

```text
185 x 160 はLINE公式サイズではない。
370 x 320候補を半分にした縮小参考画像としてのみ扱う。
```

---

# 公式条件

- PNG形式
- 背景透過
- RGB
- 72dpi以上
- 画像サイズは偶数px
- 画像1個あたり1MB以下
- ZIPアップロード時は60MB以下
- トリミング後の外枠と内容の間に10px程度の余白

---

# Codoriの暫定書き出し方針

## スタンプ画像

Codoriでは、初期パイロットのスタンプ画像を以下で確認する。

```text
横370px × 縦320px
```

理由：

- LINE通常スタンプの最大サイズを使える
- `Cadd9` など横長コード名の視認性を確保しやすい
- 文字とキャラを上下に分けても余白を取りやすい

## 鳥面積

4個の候補を並べたとき、鳥の大きさが不揃いに見えないようにする。

基準：

```text
Cの鳥表示面積を基準にする
他の鳥はC比 +/-10% に収める
```

確認コマンド：

```sh
swift tools/check_line_character_area.swift
```

## 目サイズ

目のサイズ差は、キャラクター差よりも出さないことを優先する。

基準：

```text
Cの平均目面積を基準にする
他の鳥はC比 +/-10% に収める
```

確認コマンド：

```sh
swift tools/check_character_eye_size.swift
```

---

# 制作順

本番制作では以下の順番を守る。

1. 文字なしキャラ絵を作る。
2. 背景を削除する。
3. アルファチャンネル付きPNGにする。
4. キャラの輪郭欠けを確認する。
5. コードネームを後載せする。
6. 370×320px以内に書き出す。
7. メイン画像240×240px、タブ画像96×74pxを作る。
8. 小サイズ表示で視認性を確認する。

---

# 今回のサイズ確認

背景削除前のラフを使って、LINEサイズ確認を行った。

確認用フォルダ：

```text
assets/line/review/pilot-size-check/
```

4個一覧：

```text
assets/line/review/pilot-size-check/codori_line_review_4set_370x320_sheet.png
```

個別：

```text
assets/line/review/pilot-size-check/codori_line_review_01_C_major_370x320.png
assets/line/review/pilot-size-check/codori_line_review_02_Cm_minor_370x320.png
assets/line/review/pilot-size-check/codori_line_review_03_C7_seventh_370x320.png
assets/line/review/pilot-size-check/codori_line_review_04_Cadd9_add9_370x320.png
```

メイン画像・タブ画像確認：

```text
assets/line/review/pilot-size-check/codori_line_review_main_240x240.png
assets/line/review/pilot-size-check/codori_line_review_tab_96x74.png
```

注意：

```text
これらはサイズ確認用であり、本番提出用ではない。
現在の画像は背景削除前の白背景ラフを含む。
本番提出前に、必ず透過PNGで再書き出しする。
```

---

# 今回の透過PNG候補

承認済みアプリ素材から、背景削除済みキャラクターPNGと、コードネーム後載せ済みのLINE候補画像を生成した。

生成ツール：

```text
tools/render_line_transparent_exports.swift
```

透明キャラクター素材：

```text
assets/line/source/transparent/codori_character_01_C_major_transparent.png
assets/line/source/transparent/codori_character_02_Cm_minor_transparent.png
assets/line/source/transparent/codori_character_03_C7_seventh_transparent.png
assets/line/source/transparent/codori_character_04_Cadd9_add9_transparent.png
```

スタンプ候補：

```text
assets/line/export/stickers/codori_line_01_C_major.png
assets/line/export/stickers/codori_line_02_Cm_minor.png
assets/line/export/stickers/codori_line_03_C7_seventh.png
assets/line/export/stickers/codori_line_04_Cadd9_add9.png
assets/line/export/stickers/codori_line_main_240x240.png
assets/line/export/stickers/codori_line_tab_96x74.png
assets/line/export/stickers/codori_line_4set_sheet.png
```

確認済み：

- スタンプ候補4個は `370×320px`。
- メイン画像候補は `240×240px`。
- タブ画像候補は `96×74px`。
- すべてPNG/RGBAで、アルファチャンネルあり。
- `Cadd9` は長いコード名用に、鳥を少し小さくして上下の余白を確保する。

注意：

```text
これらは制作候補であり、本番提出ファイルではない。
本番提出前に、公式ガイドライン、透過エッジ、サウンド付きスタンプ要件を再確認する。
```

確認メモ：

```text
docs/ja/stickers/app-mvp-line-derivative-export.md
assets/line/review/app-mvp-derivative/
assets/line/review/edge-check/
```

---

# 正式4鳥候補001のLINE候補

正式4鳥候補001を個別切り出し・透明PNG化し、
同じコードネーム後載せルールでLINE候補を再書き出しした。

2026-05-22時点で、正式4鳥候補001は正式採用済み。
通常の `assets/line/export/stickers/` も正式候補001ベースで再書き出し済み。

参照元：

```text
assets/app/characters/formal-candidate-001/
```

透明キャラクター素材：

```text
assets/line/formal-candidate-001/source/transparent/
```

スタンプ候補：

```text
assets/line/formal-candidate-001/export/stickers/codori_line_01_C_major.png
assets/line/formal-candidate-001/export/stickers/codori_line_02_Cm_minor.png
assets/line/formal-candidate-001/export/stickers/codori_line_03_C7_seventh.png
assets/line/formal-candidate-001/export/stickers/codori_line_04_Cadd9_add9.png
assets/line/formal-candidate-001/export/stickers/codori_line_main_240x240.png
assets/line/formal-candidate-001/export/stickers/codori_line_tab_96x74.png
assets/line/formal-candidate-001/export/stickers/codori_line_4set_sheet.png
```

確認済み：

- スタンプ候補4個は `370×320px`。
- メイン画像候補は `240×240px`。
- タブ画像候補は `96×74px`。
- すべてPNG/RGBAで、アルファチャンネルあり。
- 文字色はDeep Blue、フォントは `Arial Rounded Bold`。

注意：

```text
本番提出用ではない。
LINE申請前に公式ガイドラインと透過エッジを再確認する。
```

---

# 現時点の判断

- 370×320pxでは、`Cadd9` の1行コンパクト版が読みやすい。
- `C`, `Cm`, `C7` は十分に大きく読める。
- キャラとコードネームの上下配置は成立している。
- 文字色はB案Deep Blueを継続候補にする。
- 文字フォントは既存フォントの `Arial Rounded Bold` を第一候補にし、丸くて可愛い印象を優先する。
- 背景削除と透過PNG化は初期候補を生成済み。
- 次の課題は小サイズ表示での最終目視確認と、音声ファイル化後のサウンド付きスタンプ要件確認。

---

# 未決事項

- 本番スタンプ画像は最大サイズ370×320pxで統一するか。
- メイン画像は暫定Major単体でよいか。
- タブ画像は暫定Major単体でよいか。
- サウンド付きスタンプの音声仕様をどう確認するか。
