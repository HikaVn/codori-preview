# Codori one-point accents imagegen-v1

2026-05-29にIMAGEGENで作成した、白い鳥アクション用のワンポイント素材。

鳥本体のPNGには焼き込まず、アプリ側で重ねる。
コード種類ごとに形を固定し、キー違いは同じ形のままキー色の枠と背景で表す。

## Mapping

| Family | File | Meaning |
|---|---|---|
| Major | `major.png` | 安心のホームドット |
| minor | `minor.png` | 内向きの三日月 |
| 7 | `seventh.png` | 次へ進む矢印 |
| add9 | `add9.png` | 一粒のきらめき |
| m7 | `m7.png` | 余韻の輪 |
| maj7 | `maj7.png` | 透明な小ダイヤ |
| mM7 | `mm7.png` | 宿命の斜め小片 |
| sus4 | `sus4.png` | 未解決の浮いた点 |
| m7-5 | `m7-5.png` | 揺れる傾きダイヤ |
| dim | `dim.png` | 縮んだ小リング |
| aug | `aug.png` | 広がる小リング |

## Source

- `source-sheet-chroma.png`: IMAGEGEN出力の元シート。
- `source-sheet-alpha.png`: 緑背景を透明化したシート。
- `review-contact-sheet.png`: 切り出し確認用。

最終的にアプリで参照するのは、各コード種類ごとの256px PNG。
