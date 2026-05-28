# Codori 正式初期4鳥 画像生成プロンプト

## このファイルについて

このファイルは、
Codori正式版の初期4鳥を作り直すための画像生成プロンプトです。

現在の4鳥は雛形として扱い、
正式版では同じ絵柄・同じ世界観で描き直す。

対象：

- Major
- minor
- 7
- add9

---

# 生成方針

最初は個別キャラではなく、
4鳥を同じ画像内に並べて生成する。

目的：

- 4鳥が同じ作品に見えるか確認する
- 色だけでなくシルエットで区別できるか確認する
- Majorを基準に、minor / 7 / add9が自然に展開できているか確認する
- アプリ、LINEスタンプ、SNS、グッズに広げやすいか確認する

---

# 参照する雛形

現在の雛形：

```text
assets/approved/characters/major.png
assets/approved/characters/minor.png
assets/approved/characters/seventh.png
assets/approved/characters/add9.png
assets/approved/app/initial_four_lineup.png
```

雛形から引き継ぐこと：

- 白いCodori世界
- Majorの丸い安心感
- minorの内向き感
- 7の動き
- add9の上向き感と星
- 黒いくちばしと足
- くちばしの小さな光
- コードネームを後載せできる余白

雛形から改善すること：

- 4鳥の線幅と質感をさらに統一する
- 7の表情を少しやわらげる
- add9の星を1点に絞り、鳥本体を主役にする
- 小サイズで潰れる足や細部を整理する
- 正式素材として背景透過にしやすい形にする

---

# 4鳥ラインナップ生成プロンプト

```text
Create a clean formal character lineup of four original Codori bird mascots for a cute ukulele chord memory app.

These are not realistic birds. They are soft Japanese mascot characters designed to help beginners remember chord feelings.

The four birds must look like they belong to the same world, with the same line thickness, same soft picture-book style, same simple rounded design language, and compatible proportions.

Overall style:
soft Japanese mascot illustration, cute collectible mascot character sheet, small round bird characters, warm picture-book feeling, simple readable silhouettes, thick soft rounded outline, soft flat colors, minimal gentle shading, transparent background, no text, no chord symbols, no background objects.

Shared body rules:
mostly white soft body, tiny black rounded beak with a small highlight, tiny black feet, big gentle black eyes, short rounded wings, unified rounded wing-tip shape across all four birds, wing tips should prioritize smooth rounded contour quality; if using a small two-lobed split, it must be part of the outer contour rather than an added inner line, hidden wing tips should not be forced visible, simple compact 1.5 to 2 head body proportion, no detailed feathers, no complex costume.

Character 1: Major bird
Feeling: safe, warm, bright, gentle, stable, the home base.
Design: roundest and most stable bird, front-facing or nearly front-facing, calm happy eyes, two small mild head feathers, simple upright pose, very small warm cream or pale yellow accent only.

Character 2: minor bird
Feeling: quiet, tender, slightly sad, inward, supportive.
Design: slightly more tucked posture than Major, wings held close to chest, gentle reflective eyes, soft inward silhouette, small pale blue accent only, still mostly white.

Character 3: dominant seventh bird
Feeling: playful, active, eager to move forward, a little mischievous but not scary.
Design: slightly tilted body, one short rounded wing raised, lively eyes, forward-moving pose, tiny warm orange accent only, cute and friendly, not angry.

Character 4: add9 bird
Feeling: airy, sparkling, youthful, transparent, curious, looking upward.
Design: light upward-looking pose, curious gentle eyes, one small star accent near the bird, very small pale sky blue accent only, bird body remains the main focus.

Important learning design:
Chord family changes the bird species, body type, expression, and base pose.
Root note or key should not change the bird body color.
Do not create color variants for C, F, or G.
Do not add chord text inside the image.

Composition:
Show all four birds in one horizontal lineup with enough spacing.
Each bird should be fully visible with margins.
No labels.
Transparent background.
Sticker-ready.
```

---

# ネガティブプロンプト

```text
realistic bird, detailed feathers, pointed wing tips, jagged wing tips, finger-like wings, photographic, 3D render, glossy CG, Pixar-style, complex background, musical staff background, chord chart, ukulele in the body, text, letters, chord symbols, labels, speech bubbles, many accessories, complex costume, human hands, fingers, sharp claws, sharp beak, angry face, scary crow, villain, gothic, overly sad crying face, magical girl, too many stars, space background, color variants by key, twelve colored birds, different art styles, inconsistent line thickness, tiny unreadable details, noisy effects, sticker text baked into the character
```

---

# 生成後に確認すること

## まず見る

- 4鳥が同じ作品に見えるか
- Majorが基準鳥に見えるか
- minorがMajorの悲しい表情差分だけになっていないか
- 7が怖くないか
- add9が星頼りになっていないか
- 白い体・黒いくちばし・黒い足の基本が守られているか

## 次に見る

- 色なしでも区別できるか
- 小サイズでも顔が読めるか
- コードネーム後載せの余白があるか
- アプリで運指画像と並べたとき邪魔にならないか
- LINEスタンプ化したときに文字と競合しないか

---

# 採用候補の選び方

候補を選ぶときは、
かわいさだけでなく、学習フックとしての強さを見る。

優先順位：

1. 4鳥が同じ世界に見える
2. コード種類の違いが鳥種・体型・表情で分かる
3. Majorが一番基準に見える
4. minor / 7 / add9がMajorから自然に派生している
5. 文字なしでもスタンプにしたいかわいさがある
6. コードネームを載せても破綻しない

---

# まだ生成しないもの

この段階では、以下は生成しない。

- 12キー展開
- `F`, `G`, `D` などの音名違い
- 16個以上のスタンプ
- 新コードファミリー
- 本番LINE申請用ファイル
- サウンド付きスタンプ用音声

---

# 次の人間判断

生成されたラインナップから、
次を判断する。

- この絵柄で正式4鳥へ進めるか
- どの鳥が弱いか
- Majorの2本ハネが適切か
- minorの内向き感が強すぎないか
- 7が怖くないか
- add9の星が多すぎないか
- 個別描き直しに進むか、もう1回ラインナップ生成するか
