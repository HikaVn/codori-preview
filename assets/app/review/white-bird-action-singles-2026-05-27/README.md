# 白い鳥アクション単体化レビュー 2026-05-27

## このフォルダについて

このフォルダは、コード種類ごとの白い鳥アクションv2を、レビューしやすいように単体画像へ切り出したものです。

正式採用アセットではありません。

## 画像構成

```text
single/   512px単体レビュー画像
checks/   96px確認画像
```

確認シート：

```text
all-actions-single-sheet.png
all-actions-96px-sheet.png
mm7-adjustment-candidates.png
```

## 並び順

```text
1行目: Major / minor / 7 / add9
2行目: m7 / maj7 / mM7 / sus4
3行目: m7-5 / dim / aug
```

## mM7追加確認

```text
action-mm7-v2.png
action-mm7-v3.png
action-mm7-v4.png
action-mm7-v4-patched.png
```

判断：

- v2はコード感があるが、眉のような線が強い。
- v3は眉がなく自然だが、maj7寄りでmM7の過酷さが弱い。
- v4はポーズ方向がmM7に近いが、眉線が残る。
- v4-patchedは画像処理跡が残るため、正式候補にしない。

現時点では、mM7はv2を正式候補ベースにしつつ、v4の「羽を胸元に寄せるポーズ」を参考にする。

## 注意

今回の単体画像は背景付きの切り出しです。

背景透過の正式画像は、別工程で作成する。
