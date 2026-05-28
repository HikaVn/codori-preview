# Codori 次期正式キャラクター画像生成ブリーフ

## このファイルについて

このファイルは、次に正式キャラクター候補を画像生成するための制作ブリーフです。

対象：

```text
m7 / 夜雀
maj7 / 白鳥
```

目的：

- 初期4鳥の次に追加する正式キャラクター候補を作る。
- 既存4鳥と並べて、コード種類の違いが学習しやすいか確認する。
- アプリ、LINEスタンプ、SNS、グッズへ展開できるシンプルな鳥IPにする。

---

# 共通方針

- 1枚に1種類の鳥だけを出す。
- コード名や文字は画像に入れない。
- 鳥本体は音名 / キー違いで変えない。
- 運指図、楽器、譜面は入れない。
- 背景は透明、または白背景確認用にする。
- 複雑な羽、リアルな鳥、細かい装飾を避ける。
- 小サイズで顔とシルエットが読めることを優先する。
- 既存4鳥と同じCodori世界観にする。

共通スタイル指定：

```text
soft Japanese mascot illustration, cute collectible mascot character sheet, small rounded bird mascot, simple readable silhouette, big expressive eyes, tiny black beak, tiny black feet, soft rounded wings, gentle thick outline, minimal accent, sticker-ready transparent background, simple colors with gentle shading, high readability at small size, no text, no extra characters
```

共通ネガティブ条件：

```text
realistic bird, detailed feathers, complex costume, many accessories, busy background, sheet music, ukulele, instrument, human body, hands, fingers, scary monster, aggressive expression, excessive color palette, multiple birds, chord symbols, photorealistic, watercolor bleed, overly thin lines, tiny details, twelve color variants, separate voicing variants
```

---

# 第1候補: m7 / 夜雀

## 役割

minorより少しほどけた、夜の余韻。

## 感情

- 夜
- 余韻
- しっとり
- 力が抜ける
- 静かに寄り添う

## シルエット方向

- 小さく丸い夜の鳥。
- minorより少し肩の力が抜けている。
- 目は眠そう、でも悲しすぎない。
- 羽は体に近く、静かなポーズ。
- 色は暗くしすぎず、白い体に小さな夜色アクセント程度。

## 生成プロンプト案

```text
Create a cute Codori minor seventh bird based on a small night sparrow inspired mascot. It should feel mellow, gentle, nocturnal, and slightly relaxed, like a chord with warm night resonance. Keep a small rounded body, soft sleepy eyes, tiny black beak, tiny black feet, wings close to the body, calm cozy posture, simple readable silhouette, minimal deep-blue night accent only, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

## m7専用ネガティブ条件

```text
too sad, crying, scary black bird, crow-like, aggressive eyes, forward leaning action pose, bright star motif, too many moon accessories, realistic sparrow, complex feather pattern, dark full-body color, looks like the minor bird only recolored
```

## 確認ポイント

- minor鳥より、少しほどけた印象になっているか。
- 7鳥のように前へ進む感じになっていないか。
- add9の星・きらきら感と混ざっていないか。
- 小サイズでも夜雀らしい丸さが残るか。

---

# 第2候補: maj7 / 白鳥

## 役割

Majorより大人っぽく、透明に落ち着く音。

## 感情

- 透明感
- 上品
- 静かな光
- おしゃれ
- 浮きすぎない余白

## シルエット方向

- 白鳥らしい首の流れを、Codoriマスコットとして簡略化する。
- 首は長くしすぎない。
- 体は小さく丸く、顔は大きめに保つ。
- 目線は落ち着きがあり、上品。
- add9の星感とは分け、光は小さく静かにする。

## 生成プロンプト案

```text
Create a cute Codori major seventh bird based on a simplified swan inspired mascot. It should feel elegant, transparent, refined, and quietly bright, like a calm major chord with a beautiful seventh color. Keep a compact rounded mascot body, simplified short graceful neck, big calm eyes, tiny black beak, tiny black feet, soft rounded wings, serene posture, simple readable silhouette, minimal pale-blue or deep-blue accent only, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

## maj7専用ネガティブ条件

```text
realistic swan, long thin neck, elegant fashion costume, crown, tiara, too many sparkles, angel wings, looks like add9 bird, looks like the Codori logo icon, tiny face, complex feather detail, photorealistic water scene, lake background
```

## 確認ポイント

- Major鳥より上品で静かに見えるか。
- add9鳥より大人っぽく、星や青春感に寄りすぎていないか。
- 白鳥らしさがあるが、リアル鳥ではなくCodoriマスコットになっているか。
- 小サイズでも首と顔が潰れないか。

---

# 最初の生成単位

推奨：

```text
m7 / 夜雀: 6〜8案
maj7 / 白鳥: 6〜8案
```

進め方：

1. まず `m7 / 夜雀` を6〜8案生成する。
2. その中から2〜3案を選ぶ。
3. 初期4鳥と横並びで確認する。
4. 問題なければ `maj7 / 白鳥` を6〜8案生成する。
5. `m7` と `maj7` を同じ画面に並べ、夜感と透明感が混ざらないか確認する。

同時に大量生成しない。
特に `maj7` はロゴ白鳥との混同があるため、m7より慎重に見る。

---

# 並べて確認する順番

```text
Major / minor / 7 / add9 / m7
Major / add9 / maj7
minor / m7
m7 / maj7
```

チェックすること：

- `minor` と `m7` が、悲しさと余韻で分かれるか。
- `Major` と `maj7` が、安心と透明感で分かれるか。
- `add9` と `maj7` が、きらめきと上品さで分かれるか。
- `7` と `m7` が、前へ進む感じと夜の余韻で分かれるか。

---

# 採用保留条件

以下に当てはまる場合は、正式採用せず再生成する。

- 既存4鳥との差が色だけになっている。
- キャラがリアル鳥に寄りすぎている。
- 小サイズで目や口が読めない。
- LINEスタンプ化したときにシルエットが弱い。
- `m7` がminorより暗く重くなりすぎている。
- `maj7` がadd9やロゴ白鳥と混ざる。

---

# 次アクション

次の制作では、まず `m7 / 夜雀` の候補生成から始める。

採用判断は、ユーザー確認後に行う。

具体的なm7生成指示と選定チェックリスト：

```text
docs/ja/production/m7-formal-generation-prompt.md
docs/ja/production/m7-candidate-selection-checklist.md
```
