# Codori integrated action candidate v3

2026-05-30にIMAGEGENで作成した、白い鳥の表情差を強めた統合版候補。

v2ではminorと7の表情差が強く、他のコード種類が相対的に弱く見えた。
v3では11種類すべてを、表情、ポーズ、一般記号の組み合わせで読めるようにする。

## Mapping

| Family | File | Expression / symbol |
|---|---|---|
| Major | `action-major.png` | 明るい丸目、太陽、閉じた嘴、嘴下の口線なし |
| minor | `action-minor.png` | 悲しい顔、割れたハート |
| 7 | `action-7.png` | ドヤ顔、キラッ |
| add9 | `action-add9.png` | うつろに見上げる、水色の小さな星 |
| m7 | `action-m7.png` | グラサン、夜の余韻 |
| maj7 | `action-maj7.png` | 胸で羽を組む、十字架を見つめる |
| mM7 | `action-mm7.png` | 不気味な目元、稲妻、嘴下の口線なし |
| sus4 | `action-sus4.png` | 空中で浮く、Cと同じ目と嘴、左右の浮遊マーク |
| m7-5 | `action-m7-5.png` | 振り向きざまのちら見、頬のX傷 |
| dim | `action-dim.png` | 悪魔的な目、コウモリ羽 |
| aug | `action-aug.png` | 首を傾げる、頭に羽、？マーク |

## Source

- `source-sheet.png`: IMAGEGEN出力シート。
- `source-action-major-closed-beak-20260530.png`: Majorの嘴下の口線を消し、閉じた嘴だけにした最終出力。
- `source-action-add9-vacant-20260530.png`: add9の見上げ表情と水色星を再生成した単体出力。
- `source-action-add9-proportion-fix-20260530.png`: add9の頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-m7-sunglasses-20260530.png`: m7のグラサン姿を再生成した単体出力。
- `source-action-m7-proportion-fix-20260530.png`: m7の頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-maj7-cross-20260530.png`: maj7の胸で羽を組み、十字架を見つめる最終出力。
- `source-action-maj7-proportion-fix-20260530.png`: maj7の頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-mm7-suspense-smile-20260530.png`: mM7のサスペンス犯人風の笑みを再生成した単体出力。
- `source-action-mm7-no-mouthline-20260530.png`: mM7の嘴下の口線を消した最終出力。
- `source-action-mm7-proportion-fix-20260530.png`: mM7の頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-m7-5-nihil-scar-20260530.png`: m7-5のニヒルな表情と頬のX傷を再生成した単体出力。
- `source-action-m7-5-lookback-scar-20260530.png`: m7-5の振り向きざまのちら見と頬のX傷を再生成した単体出力。
- `source-action-m7-5-proportion-fix-20260530.png`: m7-5の頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-dim-20260530.png`: dimのコウモリ羽を再生成した単体出力。
- `source-action-aug-question-20260530.png`: augの首を傾げ、頭に羽を当て、？マークを浮かべた最終出力。
- `source-action-aug-proportion-fix-20260530.png`: augの頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-sus4-floating-smirk-20260530.png`: sus4の空中で浮くすまし顔を再生成した単体出力。
- `source-action-sus4-floating-c-eyes-20260530.png`: sus4の目をCと同じ丸目へ手修正した最終出力。
- `source-action-sus4-floating-c-eyes-position-20260530.png`: sus4の丸目を嘴より上の自然な位置へ再配置した最終出力。
- `source-action-sus4-proportion-fix-20260530.png`: sus4の頭幅、目、嘴の見た目サイズをC基準へ寄せた最終出力。
- `source-action-sus4-body-ratio-fix-20260531.png`: sus4の目サイズを維持し、体をC基準の比率へ寄せた最終出力。
- `source-action-sus4-c-face-float-marks-20260531.png`: sus4の目と嘴をC基準へ戻し、背景の点を削除して浮遊マークを追加した最終出力。
- `source-action-sus4-beak-up-20260601.png`: sus4の嘴上の余分な線を消し、嘴位置を少し上へ調整した最終出力。
- `review-contact-sheet.png`: 11種類の切り出し確認用。

最終的にアプリで参照するのは`action-*.png`の512px画像。
