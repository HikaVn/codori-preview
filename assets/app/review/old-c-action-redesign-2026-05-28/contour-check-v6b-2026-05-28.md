# v6bキャラクター輪郭チェック

## 対象

現在の学習アプリで `?actions=1` のときに参照している、以下の11画像を対象にした。

```text
assets/app/characters/action-candidate-old-c-v6b/action-major.png
assets/app/characters/action-candidate-old-c-v6b/action-minor.png
assets/app/characters/action-candidate-old-c-v6b/action-7.png
assets/app/characters/action-candidate-old-c-v6b/action-add9.png
assets/app/characters/action-candidate-old-c-v6b/action-m7.png
assets/app/characters/action-candidate-old-c-v6b/action-maj7.png
assets/app/characters/action-candidate-old-c-v6b/action-mm7.png
assets/app/characters/action-candidate-old-c-v6b/action-sus4.png
assets/app/characters/action-candidate-old-c-v6b/action-m7-5.png
assets/app/characters/action-candidate-old-c-v6b/action-dim.png
assets/app/characters/action-candidate-old-c-v6b/action-aug.png
```

## 判定基準

- 黒い輪郭ピクセルが画像端12px以内に存在しないこと。
- 最大の黒輪郭成分が十分な余白を持っていること。
- 本体の外側に、2px以上の独立した黒い輪郭成分が存在しないこと。
- 目、嘴、足など、キャラクター内部の自然な黒成分は離小島扱いしない。

## 結果

全11画像で修正が必要な切れ、または本体外の離小島輪郭は検出されなかった。

| 画像 | 黒輪郭の最小端余白 | 端12px内の黒輪郭 | 本体外の離小島輪郭 | 判定 |
|---|---:|---:|---:|---|
| action-major.png | 76px | 0 | 0 | OK |
| action-minor.png | 81px | 0 | 0 | OK |
| action-7.png | 75px | 0 | 0 | OK |
| action-add9.png | 80px | 0 | 0 | OK |
| action-m7.png | 79px | 0 | 0 | OK |
| action-maj7.png | 80px | 0 | 0 | OK |
| action-mm7.png | 87px | 0 | 0 | OK |
| action-sus4.png | 87px | 0 | 0 | OK |
| action-m7-5.png | 87px | 0 | 0 | OK |
| action-dim.png | 93px | 0 | 0 | OK |
| action-aug.png | 85px | 0 | 0 | OK |

## 補足

`action-add9.png`、`action-maj7.png`、`action-m7-5.png`では、黒成分の検出上、嘴内部に数px程度の小成分が出る。
これは本体外のゴミ輪郭ではなく、嘴の濃淡に含まれる内部成分のため、画像修正対象外とした。

旧候補フォルダ `assets/app/characters/action-candidate-2026-05-27/` には、端に接する黒輪郭を含む画像がある。
ただし、現在のアプリ参照先はv6bであり、旧候補は現行表示対象外のため今回の修正対象外とした。
