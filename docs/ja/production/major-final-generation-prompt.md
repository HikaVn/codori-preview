# Codori Major画像生成 最終プロンプト

## このファイルについて

このファイルは、CodoriのMajor候補A/B/Cを決めるために使った、Major画像生成プロンプトの履歴です。

目的：

- Major候補を20〜30案生成するための履歴を残す
- どの方向から現在のMajorに至ったかを確認する

重要：

- 2026-05-21時点で、Majorは `assets/approved/characters/major.png` を準正式採用とする。
- 新規Major大量生成は、明示的な再検討指示があるまで行わない。

---

# ChatGPTへ貼る説明

以下をChatGPTや画像生成用の相談相手へ貼って使う。

```text
Codoriという、ウクレレや音楽コードをかわいい鳥キャラクターで覚えるプロジェクトを進めています。

今回は、Codori世界の基準になる「Major鳥」の候補を20〜30案生成したいです。

重要な前提：
- まだminor・7・add9は生成しません。
- まずMajorだけを複数案出して、A/B/C候補を選びます。
- MajorはCodori全体の絵柄・かわいさ・安心感・空気感の基準になります。
- 完成品を一発で狙うのではなく、「Codoriらしい方向」を探すための試作です。
- 画像には文字を入れません。
- 背景は透明、または白背景で大丈夫です。

Major鳥の方向性：
- 明るい
- 安心する
- まっすぐ
- やさしい朝
- あたたかい光
- 帰ってこれる場所
- 「だいじょうぶ」と言ってくれそう

見た目の方向性：
- 小さくて丸い鳥
- シマエナガに少し着想を得た、ふわっとした形
- 1.5〜2頭身くらい
- 頭は少し大きめ
- 体はコンパクト
- 安定した立ち姿
- 下重心
- 短く丸い羽
- 小さく丸めのくちばし
- 大きめだけど怖くない目
- 黒目主体、白目は少なめ
- 目のハイライトは控えめ
- 表情はやさしく、少し微笑む程度
- 色は白寄りクリームとやわらかい黄色
- アクセントは入れるならごく小さく、淡いコーラル程度
- 音楽モチーフは入れるなら小さな音符1つ程度
- シンプルで白黒シルエットでも読める
- LINEスタンプやグッズにしやすい

避けたい方向：
- リアルな鳥
- 羽毛の描き込み
- 鋭いくちばし
- 足や爪の強調
- Pixar風CG
- glossy 3D mascot
- startup mascot
- corporate flat icon
- VTuberマスコット
- アニメアイドル化
- 人間っぽい顔
- 白目が多い目
- キラキラしすぎる目
- 蛍光黄色
- 金色感
- 派手なオレンジ
- 装飾過多
- 服キャラ化
- 楽譜やコード表だらけ
- 複雑な背景
- 複数キャラクター
- テンションが高すぎる表情
- ジャンプや大きすぎる動き

生成したいもの：
Major鳥のバリエーションを20〜30案。
すべて同じ方向性の中で、顔・丸さ・線・黄色の量・シマエナガ感・羽の形・立ち姿が少しずつ違う案にしてください。

目的は、ここからA/B/Cの3候補を選ぶことです。
```

---

# 画像生成プロンプト

画像生成AIに直接入れるためのプロンプト。

```text
Create 20 to 30 design variations of one cute original Codori bird mascot representing the Major chord feeling.

This is not the final production artwork. The goal is to explore the best visual direction for the Major bird, which will become the visual and emotional baseline for the Codori character world.

Character meaning:
The Major bird should feel bright, safe, warm, gentle, honest, and comforting, like a sunny morning, soft curtains, warm light, and a place you can return to. It should feel like it could softly say “だいじょうぶ”.

Design direction:
small round bird mascot, shima-enaga inspired but original, 1.5 to 2 head proportions, slightly large head, compact rounded body, stable standing pose, low center of gravity, short rounded wings, tiny rounded beak, big gentle black eyes, minimal eye highlights, very little white of the eyes, soft small smile, simple readable silhouette, warm cream and soft pale yellow base color, tiny soft coral accent only if needed, minimal music motif such as one tiny note charm only if it does not add clutter.

Style:
soft Japanese mascot illustration, picture-book feeling, collectible mascot character, clean rounded outline, slightly thick simple lines, soft flat colors, very gentle minimal shading, sticker-ready, readable at small LINE sticker size, transparent background or plain white background, no text, no extra characters, no complex background.

Variation request:
Create variations that subtly explore different face shapes, eye spacing, wing shape, roundness, yellow-to-cream balance, shima-enaga inspiration level, and stable standing posture. Keep all variations within the same Codori world direction.
```

---

# ネガティブ条件

画像生成時に避ける条件。

```text
realistic bird, detailed feathers, sharp beak, sharp claws, long legs, aggressive expression, scary face, angry face, shouting expression, hyper energetic pose, jumping pose, idol mascot, anime idol character, human-like face, human body, hands, fingers, big white eyes, overly sparkly eyes, too many highlights, Pixar-style CG, glossy 3D mascot render, realistic 3D mascot, cinematic lighting, startup mascot, corporate mascot, corporate flat icon, VTuber mascot, social game character, complex costume, clothes-heavy design, many accessories, too many music notes, dense music notation, chord chart, sheet music background, theory diagram, busy background, multiple birds, multiple characters, neon yellow, vivid yellow, gold metallic color, strong orange, high saturation, complex pattern, tiny unreadable details, separate voicing variants, minor bird, seventh bird, add9 bird
```

---

# A/B/C候補を選ぶチェックポイント

生成後、20〜30案からA/B/Cを選ぶ。

## 最初に見ること

- 第一印象で「この子かわいい」と思えるか
- Majorらしい安心感があるか
- 朝・あたたかさ・帰ってこれる感じがあるか
- Codoriの世界にいそうか
- `C` のコードネームと並べても自然に見えるか

## 見た目の確認

- 丸くて小さいか
- 安定した立ち姿か
- 顔が小サイズで読めるか
- 目が怖くないか
- くちばしが攻撃的でないか
- 羽や足が複雑すぎないか
- 白黒シルエットでも成立しそうか
- 色だけに頼っていないか

## NG判定

以下が強い案は候補から外す。

- リアル鳥
- Pixar風
- 企業マスコット風
- VTuber風
- アニメアイドル風
- 装飾過多
- 目が人間っぽい
- 小サイズで読めない
- 元気すぎてMajorの安心感が弱い

## A/B/Cの選び方

- A案：一番Codoriらしく、Majorの基準にしたい最有力候補。
- B案：A案とは違う魅力があり、修正すれば伸びそうな候補。
- C案：シルエットや空気感の比較価値がある検証候補。

---

# まだやらないこと

この段階では、以下はまだ行わない。

- minor生成
- 7生成
- add9生成
- 4鳥比較画像の生成
- LINEスタンプ本番制作
- 16個スタンプ設計
- `/goal` 移行

まずMajorだけを20〜30案生成し、A/B/C候補を選ぶ。

---

# 次に記録するファイル

Major画像生成後は、以下に記録する。

- `docs/ja/production/image-generation-log-template.md`
- `docs/ja/production/major-candidate-comparison.md`
- `docs/ja/workflow/initial-visual-decision.md`

---

# 未決事項

- Major候補A/B/Cの画像ファイル。
- Major正式採用案。
- 黄色とクリーム色の比率。
- 目のハイライト量。
- シマエナガ感をどこまで残すか。
- minor / 7 / add9へ展開する基準。
