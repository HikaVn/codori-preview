# Codori 画像生成プロンプトガイド

## このファイルについて

このファイルは、Codoriの画像生成で使うプロンプト方針をまとめる日本語正本です。

実際の画像生成プロンプトは英語で書いても構いません。ただし、採用判断・デザイン方針・NG条件は`docs/ja/`の内容を正とします。

## 現在の制作方針

現行のMajor / minor / 7 / add9は、アプリMVP用の正式素材として使います。

今すぐ初期4鳥を作り直すのではなく、次に新しい鳥種を追加するタイミングで、コード種類と鳥種の見分けやすさを再確認します。

## 共通スタイル

画像生成時の基本方向：

```text
soft Japanese mascot illustration, cute collectible mascot character sheet, small round bird character, simple readable silhouette, big expressive eyes, tiny beak, tiny feet, short rounded wings, soft friendly shape language, minimal music-note accent, sticker-ready, transparent background, simple colors with gentle shading, high readability at small size, no complex costume, no realistic feathers, no dense music notation, no extra characters
```

必要に応じて、立体確認用には以下のように指定できます。

```text
Pixar-style CG, glossy mascot render, realistic 3D mascot, simple rounded form, cute collectible character, plain background
```

ただし、正式素材の主軸は日本のマスコットらしい柔らかい2Dイラストです。3Dは形状確認やグッズ検討用に限定します。

## 共通ネガティブ条件

```text
realistic bird, detailed feathers, complex costume, many accessories, busy background, sheet music covering the body, human body, hands, fingers, scary monster, aggressive expression, excessive color palette, multiple different birds, illegible chord symbols, photorealistic, watercolor bleed, overly thin lines, tiny details, instrument with many strings, separate voicing variants, twelve color variants for each key
```

## プロンプト作成の基本ルール

- 1枚に1つの鳥種だけを出す
- コード名は原則として画像に入れない
- 音名違いのために鳥本体を変えない
- 服や小物を増やしすぎない
- 運指図を鳥の体に描かない
- 背景は透明または白背景で確認する
- 小サイズで読める顔とシルエットを優先する

## コード種類別プロンプト骨子

以下は、将来の正式鳥種追加時に使うための骨子です。

### Major / シマエナガ

```text
Create a cute Codori Major bird based on a simplified long-tailed tit inspired mascot, bright and reassuring, small round white body, soft black tiny beak and feet, big warm eyes, two mild head feathers at most, simple readable silhouette, gentle friendly posture, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### minor / 文鳥

```text
Create a cute Codori minor bird based on a simplified Java sparrow inspired mascot, tender and inward, compact rounded body, soft thoughtful eyes, wing held close to the chest, gentle supportive posture, simple readable silhouette, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### 7 / カラス

```text
Create a cute Codori seventh bird based on a simplified crow inspired mascot, playful and bluesy, lively tilted posture, mischievous friendly eyes, one wing slightly raised as if moving forward, simple readable silhouette, not scary, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### add9 / 青い小鳥

```text
Create a cute Codori add9 bird based on a small blue bird inspired mascot, sparkling youthful airy feeling, curious open eyes, light upward posture, one tiny star-note accent, simple readable silhouette, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### maj7 / 白鳥

```text
Create a cute Codori major seventh bird based on a simplified swan inspired mascot, elegant transparent refined feeling, smooth long neck simplified into a cute round mascot shape, calm eyes, graceful quiet posture, simple readable silhouette, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### m7 / 夜雀

```text
Create a cute Codori minor seventh bird based on a small night sparrow inspired mascot, mellow night feeling, gentle sleepy eyes, cozy round body, quiet emotional atmosphere, simple readable silhouette, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### sus4 / ペンギン

```text
Create a cute Codori sus4 bird based on a simplified penguin inspired mascot, floating unresolved feeling, one foot lifted as if not landing yet, curious eyes, compact rounded body, simple readable silhouette, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

### m7-5 / フクロウ

```text
Create a cute Codori minor seven flat five bird based on a simplified owl inspired mascot, unstable urban night tension, slightly nervous inward posture, round eyes, compact body, not scary, simple readable silhouette, sticker-ready transparent background, soft Japanese mascot illustration, cute collectible mascot character sheet, no text, no extra birds.
```

## キャラクターシート生成テンプレート

```text
Create a cute Codori character sheet for one chord-family bird. Show the same bird in 5 small expressions: calm, happy, thinking, surprised, and listening. Keep the same body shape, silhouette, eye size, beak shape, feet, and accent rules across all expressions. Plain white or transparent background. No text labels. No extra character variants. No voicing-specific designs.
```

## LINE候補用テンプレート

LINE候補は、アプリ素材を派生させるのが基本です。

```text
Create a LINE sticker-style Codori chord bird composition using the approved character design. Keep the bird large in frame, transparent background, bold readable silhouette, cute expression, clean rounded outline, minimal music motif. Leave clear space for a large chord-name label to be added later. Do not include daily phrases. Do not add extra birds.
```

## レビュー基準

生成後は以下を確認します。

- 鳥種がコード種類の感情と合っているか
- 小さくしても顔とシルエットが読めるか
- 色やアクセントが増えすぎていないか
- 音名違いに見える余計な色違いが入っていないか
- 鳥と運指図が混ざっていないか
- LINE 370x320と96x74で読めるか

## 未決事項

- 新しい鳥種を最初に作る順番は、2026-05-23時点では `m7 / 夜雀` を第1候補、`maj7 / 白鳥` を第2候補とする
- maj7 / m7 / sus4の正式デザイン着手タイミングは、まずm7候補生成後にmaj7へ進む
- 音名アクセントを画像内に入れるか、アプリUI側で処理するか

次期正式キャラクター制作ブリーフ：

```text
docs/ja/production/next-formal-character-generation-brief.md
```

m7正式候補の生成準備：

```text
docs/ja/production/m7-formal-generation-prompt.md
docs/ja/production/m7-candidate-selection-checklist.md
```
