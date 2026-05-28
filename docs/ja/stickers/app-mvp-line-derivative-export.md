# Codori アプリMVPからLINE候補への正式派生書き出し

## このファイルについて

このファイルは、Codoriウクレレコード記憶アプリMVPで採用している正式4鳥を、
LINEスタンプ候補へ派生書き出しした結果を整理する確認メモです。

LINEスタンプは主目的ではなく、アプリ素材から派生する展開として扱います。

---

# 対象

初期4コード：

```text
C
Cm
C7
Cadd9
```

参照元：

```text
assets/approved/characters/major.png
assets/approved/characters/minor.png
assets/approved/characters/seventh.png
assets/approved/characters/add9.png
```

---

# 書き出し方針

1. アプリMVPで使う正式4鳥を参照する。
2. 鳥画像の背景を削除し、透明PNG化する。
3. 透明PNGにコードネームを後載せする。
4. LINE候補サイズへ書き出す。
5. 4個一覧と縮小参考画像を作る。

コードネームは画像生成時に焼き込まない。
背景削除後の透明PNGへ後載せすることで、輪郭の品質と再利用性を優先する。

---

# 生成ツール

```text
tools/render_line_transparent_exports.swift
```

実行内容：

```sh
swift tools/render_line_transparent_exports.swift assets/line/source/transparent assets/line/export/stickers assets/approved/characters
```

---

# 生成済みファイル

## 透明キャラクター素材

```text
assets/line/source/transparent/codori_character_01_C_major_transparent.png
assets/line/source/transparent/codori_character_02_Cm_minor_transparent.png
assets/line/source/transparent/codori_character_03_C7_seventh_transparent.png
assets/line/source/transparent/codori_character_04_Cadd9_add9_transparent.png
```

用途：

- LINE候補の土台
- SNSや教材用の切り抜き素材
- 将来のコードネーム差し替え

## LINE候補

```text
assets/line/export/stickers/codori_line_01_C_major.png
assets/line/export/stickers/codori_line_02_Cm_minor.png
assets/line/export/stickers/codori_line_03_C7_seventh.png
assets/line/export/stickers/codori_line_04_Cadd9_add9.png
assets/line/export/stickers/codori_line_main_240x240.png
assets/line/export/stickers/codori_line_tab_96x74.png
assets/line/export/stickers/codori_line_4set_sheet.png
```

## レビュー用

```text
assets/line/review/app-mvp-derivative/codori_line_app_mvp_derivative_4set_sheet_2026-05-22.png
assets/line/review/app-mvp-derivative/codori_line_app_mvp_derivative_4set_sheet_2026-05-22_370x320.png
assets/line/review/app-mvp-derivative/codori_line_app_mvp_derivative_4set_sheet_2026-05-22_185x160.png
```

透過エッジ確認：

```text
assets/line/review/edge-check/codori_line_edge_review_checker_dark_2026-05-22.png
assets/line/review/edge-check/codori_line_tab_edge_review_2026-05-22.png
```

注意：

```text
185 x 160 はLINE公式サイズではない。
370 x 320 の半分サイズとして作った縮小参考画像。
```

---

# 確認済み

## 公式サイズ

2026-05-22時点で、LINE Creators Marketの公式ガイドラインを確認。

| 種類 | Codori候補 | 公式サイズとの関係 |
|---|---:|---|
| スタンプ画像 | 370 x 320 | 公式上限サイズ以内 |
| メイン画像 | 240 x 240 | 公式サイズ |
| トークルームタブ画像 | 96 x 74 | 公式サイズ |
| 縮小参考画像 | 185 x 160 | 公式サイズではない |

公式ガイドライン：

```text
https://creator.line.me/ja/guideline/sticker/
```

## サイズ

| ファイル | サイズ | 透過 |
|---|---:|---|
| `codori_line_01_C_major.png` | 370 x 320 | あり |
| `codori_line_02_Cm_minor.png` | 370 x 320 | あり |
| `codori_line_03_C7_seventh.png` | 370 x 320 | あり |
| `codori_line_04_Cadd9_add9.png` | 370 x 320 | あり |
| `codori_line_main_240x240.png` | 240 x 240 | あり |
| `codori_line_tab_96x74.png` | 96 x 74 | あり |
| `codori_line_4set_sheet.png` | 740 x 640 | あり |

## 形式

- PNG
- RGBA
- アルファチャンネルあり
- 個別スタンプ候補はすべて1MB以下

## 視認性

- 370 x 320の実寸候補では、`Cadd9` のコード名は読める。
- 96 x 74のタブ画像はMajor単体で成立している。
- 185 x 160は縮小参考として確認する。LINE提出仕様ではない。

## 透過エッジ

チェッカー背景と濃色背景で確認した。

確認用画像：

```text
assets/line/review/edge-check/codori_line_edge_review_checker_dark_2026-05-22.png
assets/line/review/edge-check/codori_line_tab_edge_review_2026-05-22.png
```

確認結果：

- 4個候補とも、背景の大きな白残りは見えない。
- 4個候補とも、鳥やコードネームの輪郭欠けは見えない。
- `Cadd9` は370 x 320実寸でコード名が読める。
- 96 x 74タブ画像はMajor単体として読める。

余白確認：

| ファイル | 左 | 右 | 上 | 下 |
|---|---:|---:|---:|---:|
| C | 80 | 80 | 20 | 11 |
| Cm | 92 | 92 | 20 | 11 |
| C7 | 75 | 75 | 20 | 11 |
| Cadd9 | 76 | 76 | 18 | 18 |
| tab | 19 | 19 | 6 | 6 |

短いコード名は下余白が7pxだったため、
`C / Cm / C7` のコードネームを少し上げ、下余白を11pxにした。

## 鳥面積

LINE候補では、`C` の鳥表示面積を基準にし、
他の鳥の表示面積を `C` 比 `±10%` に収める。

確認コマンド：

```sh
swift tools/check_line_character_area.swift
```

確認結果：

| コード | C比 | 判定 |
|---|---:|---|
| C | 0.0% | OK |
| Cm | -1.5% | OK |
| C7 | -1.6% | OK |
| Cadd9 | -4.8% | OK |

`Cadd9` は以前の書き出しでは小さく見えたため、
コードネーム領域を保ったまま鳥表示を拡大した。
その後、目だけで合わせず全体のバランスを取るため、
鳥全体をC比約5%小さく再調整した。

## 目サイズ

目の大きさは、キャラクター差よりも共通感を優先する。
`C` の平均目面積を基準にし、他の鳥を `C` 比 `±10%` に収める。

確認コマンド：

```sh
swift tools/check_character_eye_size.swift
```

確認結果：

| コード | C比 | 判定 |
|---|---:|---|
| C | 0.0% | OK |
| Cm | -7.8% | OK |
| C7 | +5.3% | OK |
| Cadd9 | +0.3% | OK |

## 羽先

追加方針：

```text
羽先は元々のCの形を基準に、見えている先端だけ小さな丸い2山の割れへ揃える。
```

理由：

- LINE小サイズで鳥ごとの作風差に見えないようにする
- 7の上げ羽やadd9の流れ羽が、別の絵柄に見えるのを防ぐ
- グッズ化・ぬいぐるみ化で形を単純に保つ

現在の扱い：

- 正本仕様には反映済み
- 前回の非破壊タッチアップ候補は不採用
- 追加割れ線は撤回済み
- 既存の正式素材は上書きしない
- 現段階では正式4鳥の元画像を維持する
- アプリMVPとLINE候補は、現行正式4鳥ベースで継続する
- 詳細指示は `docs/ja/production/formal-bird-wingtip-touchup-guide.md` で管理する
- 結果は `docs/ja/production/formal-bird-wingtip-touchup-result.md` に記録する

候補ファイル：

```text
assets/touchups/wingtip-revert-candidate-2026-05-22/characters/
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/
assets/touchups/wingtip-revert-candidate-2026-05-22/line/review/edge-check/
```

---

# 文字スタイル

現在の候補：

```text
Deep Blue
白フチ
薄い影
Arial Rounded Bold優先
```

`Cadd9` は横長なので、鳥を少し小さめにし、コードネームを1行で読めるようにする。

---

# 判断

- アプリMVPの正式4鳥からLINE候補への派生書き出しは成立。
- 4個ともコードネームのみで成立している。
- `C / Cm / C7 / Cadd9` の文字は学習用途として読みやすい。
- `Cadd9` は370 x 320実寸で可読性あり。
- 透過エッジはチェッカー背景・濃色背景で大きな白残りや欠けなし。
- 鳥面積は `C` 基準の `±10%` に収まっている。
- 目サイズは `C` 基準の `±10%` に収まっている。
- `Cadd9` は鳥全体をC比約5%小さくした。
- 羽先の追加割れ候補は不採用。ラスター線足しでは品質が保てないため、現段階では正式4鳥の元画像を維持する。
- 次に羽先を揃える場合は、追加線ではなく輪郭そのものの描き直しで行う。
- 羽先は次回描き直し時の注意として残し、LINE派生確認は通常フローへ戻す。
- 透明PNGを土台にしているため、将来の音名違い・SNS転用・教材転用に対応しやすい。

---

# まだやらないこと

- LINE本番申請
- サウンド付きスタンプの音声仕様確定
- 16個以上の量産
- 12キー展開
- 新キャラ追加

---

# 次に確認すること

- 縮小参考画像での見え方
- 透過エッジの欠けや白フチの残り
- サウンド付きスタンプ化するときの音声長さ・形式・容量
- メイン画像とタブ画像をMajor単体でよいか

---

# 未決事項

- 本番用の第1弾は4個確認のままにするか、8個セットへ拡張するか。
- サウンド付きスタンプの音声はアプリ用音源と共通化するか、LINE用に別マスターを作るか。
- コードネーム位置は全コードで下配置固定にするか、長いコードだけ微調整を許すか。
