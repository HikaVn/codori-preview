# Codori integrated action candidate v3

2026-05-30にIMAGEGENで作成した、白い鳥の表情差を強めた統合版候補。

v2ではminorと7の表情差が強く、他のコード種類が相対的に弱く見えた。
v3では11種類すべてを、表情、ポーズ、一般記号の組み合わせで読めるようにする。

## Mapping

| Family | File | Expression / symbol |
|---|---|---|
| Major | `action-major.png` | 明るい笑顔、太陽 |
| minor | `action-minor.png` | 悲しい顔、割れたハート |
| 7 | `action-7.png` | ドヤ顔、キラッ |
| add9 | `action-add9.png` | うつろに見上げる、水色の小さな星 |
| m7 | `action-m7.png` | グラサン、夜の余韻 |
| maj7 | `action-maj7.png` | 夢見る目、ダイヤ |
| mM7 | `action-mm7.png` | 不気味な笑み、稲妻 |
| sus4 | `action-sus4.png` | 空中で浮く、すまし顔 |
| m7-5 | `action-m7-5.png` | 振り向きざまのちら見、頬のX傷 |
| dim | `action-dim.png` | 悪魔的な目、コウモリ羽 |
| aug | `action-aug.png` | 開放、外向き矢印 |

## Source

- `source-sheet.png`: IMAGEGEN出力シート。
- `source-action-add9-vacant-20260530.png`: add9の見上げ表情と水色星を再生成した単体出力。
- `source-action-m7-sunglasses-20260530.png`: m7のグラサン姿を再生成した単体出力。
- `source-action-mm7-suspense-smile-20260530.png`: mM7のサスペンス犯人風の笑みを再生成した単体出力。
- `source-action-m7-5-nihil-scar-20260530.png`: m7-5のニヒルな表情と頬のX傷を再生成した単体出力。
- `source-action-m7-5-lookback-scar-20260530.png`: m7-5の振り向きざまのちら見と頬のX傷を再生成した単体出力。
- `source-action-dim-20260530.png`: dimのコウモリ羽を再生成した単体出力。
- `source-action-sus4-floating-smirk-20260530.png`: sus4の空中で浮くすまし顔を再生成した単体出力。
- `review-contact-sheet.png`: 11種類の切り出し確認用。

最終的にアプリで参照するのは`action-*.png`の512px画像。
