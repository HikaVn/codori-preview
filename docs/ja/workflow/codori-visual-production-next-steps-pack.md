# codori-visual-production-next-steps-pack.md

# Codori ビジュアル制作 次ステップ一括パック

## このファイルについて

このファイルは、
Codoriプロジェクトの次フェーズを効率よく進めるための一括作業指示書。

目的：

- 精度を落とさずに作業を進める
- Majorだけで止まらず、初期4鳥まで到達する
- ただし、/goalによる大量実行はまだ避ける
- ビジュアル基準を固める

---

# 現在位置

Codoriは現在、

## 設定整理フェーズ

から

## ビジュアル基準固定フェーズ

へ移る段階。

まだ：

- 32個LINEスタンプ量産
- 全コード図鑑化
- 12キー展開
- 全キャラ一括生成

は早い。

---

# 今回まとめて進める範囲

以下を一括で進める。

1. Major画像生成
2. Major候補選別
3. minor / 7 / add9への展開
4. 初期4鳥比較
5. 白黒シルエット確認
6. LINEサイズ確認
7. 採用候補整理
8. /goal実行可否判断

---

# 読むべきファイル

作業前に以下を確認する。

```text
AGENTS.md
CODEX_GOAL.md
FIRST_MESSAGE.md
docs/ja/core/visual-style-guide.md
docs/ja/core/world-tone-guide.md
docs/ja/characters/major-character-sheet.md
docs/ja/characters/starter-birds-overview.md
docs/ja/production/first-image-prompts.md
docs/ja/production/silhouette-test-notes.md
docs/ja/production/major-image-review-checklist.md
docs/ja/production/image-generation-log-template.md
```

存在しない場合は、
同名ファイルをプロジェクト内から探して参照する。

---

# Step 1：Majorを生成する

## 目的

Codori全体の基準となるMajor鳥を探す。

---

## 生成数

推奨：

```text
20〜30案
```

---

## 選ぶ基準

まず直感で：

```text
この子かわいい
この子はCodoriっぽい
```

と思えるものを選ぶ。

---

## Majorの必須条件

- 安心感がある
- 朝っぽい
- 丸い
- やさしい
- 下重心
- 小サイズで顔が読める
- LINEで使いたくなる

---

## MajorのNG

- 元気すぎる
- 企業マスコット感
- Pixar感
- VTuber感
- リアル鳥感
- 黄色が強すぎる
- 目が大きすぎる

---

# Step 2：Major候補を3案に絞る

## 目的

1案即決を避ける。

---

## 記録すること

各候補について以下を書く。

```text
A案
良い点：
気になる点：

B案
良い点：
気になる点：

C案
良い点：
気になる点：
```

---

## 保存先

推奨：

```text
assets/rough/
assets/approved/
```

---

# Step 3：minor / 7 / add9へ展開する

## 目的

Majorの絵柄を基準に、
初期4鳥が同じ世界に見えるか確認する。

---

## 生成対象

- minor
- 7
- add9

---

## 重要

この段階では、
M7、m7、dim、aug、m7-5をまだ増やさない。

---

# Step 4：初期4鳥を並べる

## 並べる対象

```text
Major
minor
7
add9
```

---

## 見るポイント

- 同じ世界に見えるか
- 線の太さが揃っているか
- 顔のサイズ感が揃っているか
- 感情差があるか
- 色だけで差別化していないか

---

# Step 5：白黒シルエット化する

## 目的

色や文字に頼らず、
形だけで区別できるか確認する。

---

## 確認サイズ

```text
64px
48px
32px
```

---

## 合格目安

- Major：安定、安心
- minor：少し内向き
- 7：動き、前進感
- add9：軽さ、上向き感

---

# Step 6：LINEサイズ確認

## 目的

実際の使用感に近いサイズで確認する。

---

## 見るポイント

- 顔が読める
- 感情が読める
- 文字なしでも使えそう
- 背景なしで成立する
- 細かすぎる装飾がない

---

# Step 7：採用候補を整理する

## 作るもの

```text
docs/ja/workflow/initial-visual-decision.md
```

---

## 内容

- 採用候補画像
- 良い点
- 修正点
- 採用理由
- 不採用理由
- 次に生成する方向

---

# Step 8：/goal実行可否を判断する

## /goal実行可能条件

以下が揃ったら実行可能。

```text
[ ] Major方向が決まった
[ ] minor / 7 / add9が同じ世界に見える
[ ] 白黒シルエットで区別できる
[ ] LINEサイズで読める
[ ] 絵柄ルールが明確になった
[ ] 採用候補がassets/approvedに入っている
```

---

## まだ /goal しない方がよい場合

以下に該当する場合は、まだ調整する。

```text
[ ] 4鳥が別作品に見える
[ ] 色だけで差別化している
[ ] 小サイズで潰れる
[ ] Majorがしっくり来ていない
[ ] add9が装飾頼り
[ ] 7が怖すぎる
```

---

# /goal可能後に調整するファイル

/goal実行可能になったら、
以下を更新する。

```text
AGENTS.md
CODEX_GOAL.md
FIRST_MESSAGE.md
```

---

# 更新内容

## AGENTS.md

- 日本語正本化
- docs/ja優先ルール追加
- approved画像参照ルール追加
- 量産時の禁止事項追加

---

## CODEX_GOAL.md

- 初期4鳥が確定したことを反映
- 次のゴールをLINEスタンプ試作へ変更
- /goalの完了条件を具体化

---

## FIRST_MESSAGE.md

- 参照すべきdocs/jaファイルを明記
- approved画像がある場合は必ず確認
- 作業開始時に対象フェーズを判定

---

# この段階での禁止事項

まだ以下は禁止。

- 全コード一括生成
- 12キー展開
- 32個以上のLINEスタンプ量産
- 画像の大量カラバリ
- 理論説明資料の拡大

---

# Codexへ投げる短文指示例

```text
Codoriのビジュアル基準固定フェーズを進めます。

以下を読んでください：
- AGENTS.md
- CODEX_GOAL.md
- docs/ja/core/visual-style-guide.md
- docs/ja/characters/major-character-sheet.md
- docs/ja/characters/starter-birds-overview.md
- docs/ja/production/first-image-prompts.md
- docs/ja/production/silhouette-test-notes.md
- docs/ja/production/major-image-review-checklist.md
- docs/ja/production/image-generation-log-template.md

今回は大量展開ではなく、Majorを基準に初期4鳥（Major, minor, 7, add9）のビジュアル方向を固める作業です。

まずMajor生成とレビューに必要な作業手順を整理し、必要なファイルやフォルダが不足していれば作成してください。
```

---

# 画像生成後の報告テンプレート

```text
作業結果：

1. 生成・確認したキャラ
2. 採用候補
3. 良かった方向
4. 崩れた方向
5. 次に修正する点
6. /goal可能かどうか
```

---

# 次に作るべきファイル

画像生成後に以下を作る。

```text
docs/ja/workflow/initial-visual-decision.md
```

---

# initial-visual-decision.md の内容案

```text
# 初期ビジュアル決定メモ

## 採用候補

## Major採用理由

## minorとの差別化

## 7との差別化

## add9との差別化

## 白黒シルエット結果

## LINEサイズ確認結果

## 修正すべき点

## 次に進めるか

## /goal可否
```

---

# 最終判断

今やるべきことは：

## 設定を増やすことではなく、
## 4鳥の見た目を固定すること。

そのため、
このパックを実行したあとに、
AGENTS.md / CODEX_GOAL.md / FIRST_MESSAGE.md を調整する。
