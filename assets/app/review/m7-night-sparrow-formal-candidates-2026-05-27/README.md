# m7 / 夜雀 正式候補レビュー 2026-05-27

## このフォルダについて

`m7 / 夜雀`の正式候補画像を確認するためのレビュー用フォルダです。

正式採用アセットではありません。
採用判断後に、必要であれば背景透過・単体再生成・アプリ組み込み用リサイズを行います。

## 生成物

初回3案：

```text
m7-night-sparrow-candidates-08-01-02-sheet.png
```

修正版3案：

```text
m7-night-sparrow-candidates-revised-sheet.png
```

修正版の個別切り出し：

```text
m7-night-sparrow-candidate-a.png
m7-night-sparrow-candidate-b.png
m7-night-sparrow-candidate-c.png
```

タイト切り出し：

```text
m7-night-sparrow-candidate-a-tight.png
m7-night-sparrow-candidate-b-tight.png
m7-night-sparrow-candidate-c-tight.png
```

96px幅確認：

```text
m7-night-sparrow-candidate-a-tight-96w.png
m7-night-sparrow-candidate-b-tight-96w.png
m7-night-sparrow-candidate-c-tight-96w.png
```

## 初回3案の判断

初回3案は、かわいさと夜感はある。
ただし、濃い頭部と白い腹の比率が強く、ペンギンに寄るリスクがある。

そのため、正式候補としては修正版を優先して見る。

## 修正版3案の判断

| 候補 | 評価 | 理由 |
|---|---|---|
| A | シルエット確認用に有力 | 小鳥として読みやすく、96pxでも崩れにくい。m7の余韻はやや薄い |
| B | 現時点の本命 | 夜感、余韻、やわらかさのバランスがよい。minorより沈みすぎない |
| C | 派生候補 | 横向きでキャラ性がある。正式基準にするには少し表情が強い |

## 現時点の判断

この夜雀案はボツにする。

理由：

- 本番方針を「元の白い鳥のアクション違い」に変更したため。
- `m7`を夜雀という別鳥種にしないため。
- 今後は、白い鳥の「夜にほどけるアクション」として作り直すため。

過去検討としては以下を記録する。

```text
旧検討で最も近かった案: B
比較用: A
派生候補: C
```

次回は、元の白い鳥をベースに以下を狙う。

- 背景なし、または背景透過前提の単体生成
- 星、月、背景装飾なし
- 鳥種は変えない
- アクションだけで`m7`の余韻を出す
- minorアクションより脱力、mM7アクションより軽い

## 参照プロンプト

```text
docs/ja/characters/m7-night-sparrow-generation-prompts.md
```
