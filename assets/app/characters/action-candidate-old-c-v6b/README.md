# 旧C基準白い鳥アクション候補 v6b

## このフォルダについて

旧アプリ初期版のC鳥を正として作り直した、コード種類別アクション候補です。

本番採用前の確認用ですが、学習アプリの `?actions=1` 表示はこのv6bを参照します。

## 基準

- 旧アプリ初期版C鳥の体型、目、嘴、頬、羽、足を正とする
- コード種類は鳥種差ではなく、同じ白い鳥の微アクション差で表す
- キー違いはアクションを変えず、アプリ側のキー色で表す
- 嘴の下に余計な笑い線を入れない
- 眉、衣装、小物、別種化を避ける

## 対応表

| コード種類 | 画像 |
|---|---|
| Major | action-major.png |
| minor | action-minor.png |
| 7 | action-7.png |
| add9 | action-add9.png |
| m7 | action-m7.png |
| maj7 | action-maj7.png |
| mM7 | action-mm7.png |
| sus4 | action-sus4.png |
| m7-5 | action-m7-5.png |
| dim | action-dim.png |
| aug | action-aug.png |

## レビュー用シート

```text
assets/app/review/old-c-action-redesign-2026-05-28/old-c-action-v6b-app-assets-sheet.png
```

## 注意

- 元画像シートから個別に切り出したレビュー用候補。
- 黒い輪郭領域の外接範囲を検出し、中央寄せと余白確保を行っている。
- 隣接する鳥の黒い断片が端に入った画像は、端に接する黒成分だけを背景色で補正している。
- 11画像すべてで、黒い輪郭領域が画像端12px以内に接していないことを確認済み。
- 2026-05-28に、キャラ切れと本体外の離小島輪郭を再チェック済み。全11画像で修正が必要な切れ・不要輪郭は検出なし。
- 詳細は `assets/app/review/old-c-action-redesign-2026-05-28/contour-check-v6b-2026-05-28.md` を参照。
- 正面向きのMajor / minor / add9 / m7 / maj7 / mM7 / sus4 / dimは、黒い輪郭領域の縦横比をMajor基準の約0.889へ補正済み。
- 7 / m7-5 / augは、横羽・傾き・広げアクションのため、同一縦横比の対象外。
- 透明背景の本番素材ではない。
