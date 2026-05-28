# Codori コードネーム文字スタイル確認

## このファイルについて

このファイルは、Codoriスタンプに後載せするコードネーム文字のスタイル確認メモです。

コードネームは、文字なしキャラ絵を透過PNG化したあとに別レイヤーで重ねる。

---

# 確認画像

比較シート：

```text
assets/rough/stickers/pilot/chord-text/style-check/chord_text_style_sheet_2026-05-21_001.png
```

縮小確認：

```text
assets/rough/stickers/pilot/chord-text/style-check/chord_text_style_sheet_2026-05-21_001_1024px.png
assets/rough/stickers/pilot/chord-text/style-check/chord_text_style_sheet_2026-05-21_001_512px.png
```

---

# B案適用画像

B案：Deep Blueを4個パイロットへ適用した。

個別画像：

```text
assets/rough/stickers/pilot/chord-text/deep-blue/pilot_major_C_deep_blue_2026-05-21_001.png
assets/rough/stickers/pilot/chord-text/deep-blue/pilot_minor_Cm_deep_blue_2026-05-21_001.png
assets/rough/stickers/pilot/chord-text/deep-blue/pilot_seventh_C7_deep_blue_2026-05-21_001.png
assets/rough/stickers/pilot/chord-text/deep-blue/pilot_add9_Cadd9_deep_blue_2026-05-21_001.png
```

4個一覧：

```text
assets/rough/stickers/pilot/chord-text/deep-blue/pilot_sticker_4set_deep_blue_2026-05-21_001.png
```

縮小確認：

```text
assets/rough/stickers/pilot/chord-text/deep-blue/checks/pilot_sticker_4set_deep_blue_2026-05-21_001_1024px.png
assets/rough/stickers/pilot/chord-text/deep-blue/checks/pilot_sticker_4set_deep_blue_2026-05-21_001_512px.png
assets/rough/stickers/pilot/chord-text/deep-blue/checks/pilot_sticker_4set_deep_blue_2026-05-21_001_256px.png
assets/rough/stickers/pilot/chord-text/deep-blue/checks/pilot_sticker_4set_deep_blue_2026-05-21_001_128px.png
```

---

# Cadd9調整版

`Cadd9` の可読性を上げるため、add9のみ1行コンパクト版を作成した。

4個一覧：

```text
assets/rough/stickers/pilot/chord-text/deep-blue-compact-add9/pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002.png
```

縮小確認：

```text
assets/rough/stickers/pilot/chord-text/deep-blue-compact-add9/checks/pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002_1024px.png
assets/rough/stickers/pilot/chord-text/deep-blue-compact-add9/checks/pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002_512px.png
assets/rough/stickers/pilot/chord-text/deep-blue-compact-add9/checks/pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002_256px.png
assets/rough/stickers/pilot/chord-text/deep-blue-compact-add9/checks/pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002_128px.png
```

Cadd9比較：

```text
assets/rough/stickers/pilot/chord-text/deep-blue/cadd9-variants/pilot_add9_Cadd9_variants_sheet_2026-05-21_001.png
assets/rough/stickers/pilot/chord-text/deep-blue/cadd9-variants/checks/pilot_add9_Cadd9_variants_sheet_2026-05-21_001_256px.png
```

---

# 比較したスタイル

| 案 | 名前 | 特徴 | 判断 |
|---|---|---|---|
| A | Charcoal | 濃いグレー文字、白フチ、影 | 最も読みやすい。やや実用寄り |
| B | Deep Blue | 青文字、白フチ、影 | 読みやすさと音楽IP感のバランスが良い |
| C | Warm Coral | コーラル文字、白フチ、影 | かわいいが、白背景や小サイズで少し弱い |
| D | White Badge | 白文字、濃色フチ | 透明背景には強いが、文字の主張が強い |

---

# 暫定おすすめ

## 第1候補

B案：Deep Blue

理由：

- 白いキャラ本体と混ざりにくい
- 音楽学習・アプリ展開に合う
- かわいさを残しながら読みやすい
- `C`, `Cm`, `C7` はかなり読みやすい

---

## 第2候補

A案：Charcoal

理由：

- 最も視認性が高い
- LINE実表示サイズでも崩れにくい
- グッズや教材にも使いやすい

注意：

- かわいさより実用感が少し強い

---

# Cadd9について

`Cadd9` は横幅が長いため、どの案でも他のコードより小さく見える。

正式化前に確認すること：

- `Cadd9` を1行で維持するか
- `C add9` のようにスペースを入れるか
- `C` と `add9` を2段にするか
- add9だけ文字サイズを少し小さくして許容するか

現時点の暫定判断：

```text
1行の Cadd9 を維持する。
ただし、add9だけ文字幅と縁取りを調整したコンパクト版を使う。
```

---

# 文字サイズ方針

- コードネームは大きめにする
- キャラの顔、くちばし、足には重ねない
- 下部配置を基本にする
- 文字は太め
- 白フチまたは濃色フチを付ける
- 影は薄く、読みやすさ補助に留める

---

# 次の確認

1. B案Deep Blue + Cadd9コンパクト版を確認する。
2. この文字スタイルをパイロットの仮本命にするか判断する。
3. 本番透過PNG上で同じ文字スタイルを再合成する。
4. 必要ならA案を視認性優先の代替案にする。

---

# 現時点の判断

B案は4個セットとして成立している。

- `C`, `Cm`, `C7` は小サイズでも読みやすい
- `Cadd9` はコンパクト版でかなり読みやすくなった
- 青文字は白いキャラ本体と分離して見える
- 白フチと薄い影は視認性補助として有効
- 文字がキャラの顔やくちばしを潰していない

暫定結論：

```text
B案Deep Blueを仮本命として継続。
Cadd9は1行コンパクト版を採用候補にする。
```

---

# 未決事項

- 最終文字色をB案の青で進めるか。
- `Cadd9` を1行のままにするか。
- 本番透過PNGでは文字に白フチと影を両方使うか。
- キー違い展開時に、文字色を固定するか、キーアクセントに合わせて変えるか。
