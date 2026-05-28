# first-image-prompts.md

# Codori 初期画像生成プロンプト

## このファイルについて

このファイルは、
Codoriの初期4鳥を画像生成AIで試作するためのプロンプト集。

対象：

- Major
- minor
- 7
- add9

目的：

- Codoriの絵柄基準を探す
- 4鳥の感情差を確認する
- LINEスタンプ化できる見た目か確認する
- 白黒シルエットでも区別できるか確認する

---

# 画像生成の基本方針

最初から完成品を狙わない。

まずは：

- Majorを多めに生成
- 良い方向を選ぶ
- minor / 7 / add9へ展開
- 4鳥を並べて統一感を見る

という順で進める。

---

# 共通スタイルプロンプト

すべての画像生成で共通して使う。

```text
cute original Codori bird mascot, small round bird character, soft Japanese mascot style, picture-book feeling, rounded silhouette, big gentle eyes, tiny rounded beak, tiny feet, short rounded wings, simple clean outline, soft flat colors, gentle minimal shading, sticker-ready, transparent background, large readable face, no text, no extra characters, no complex background
```

---

# 共通ネガティブプロンプト

```text
realistic bird, detailed feathers, sharp beak, scary face, aggressive expression, Pixar-style CG, glossy 3D render, startup mascot, corporate flat icon, VTuber mascot, human body, hands, fingers, complex costume, many accessories, dense music notation, chord chart, sheet music covering body, tiny unreadable details, busy background, multiple birds, separate voicing variants
```

---

# 生成ルール

## 最初にやること

Majorだけを複数案生成する。

推奨：

```text
Major bird variations, 20 to 30 images
```

ただし、
すべてを使うのではなく、
「Codoriらしさ」を探すための試作とする。

---

# Major プロンプト

```text
Create a cute original Codori bird mascot representing the Major chord feeling.

The character should feel warm, gentle, bright, safe, and like a sunny morning.
It should look like the friendly entrance character of the Codori world.

Design:
small round bird, soft shima-enaga inspired shape, large gentle eyes, tiny rounded beak, short rounded wings, stable standing pose, slightly big head, compact body, warm cream and soft yellow base color, very small coral accent, simple silhouette, no complex details.

Mood:
安心感, やさしい朝, だいじょうぶ, ほっとする.

Style:
soft Japanese mascot style, picture-book feeling, sticker-ready, clean rounded outline, soft flat colors, minimal gentle shading, transparent background, no text, no extra characters.
```

---

# Major ネガティブ補足

```text
not hyper energetic, not idol-like, not corporate mascot, not realistic, not sharp, not overly yellow, not glossy 3D, not complex music theory design
```

---

# minor プロンプト

```text
Create a cute original Codori bird mascot representing the minor chord feeling.

The character should feel tender, quiet, slightly sad, thoughtful, and gently supportive.
It should look like a soft friend who stays beside you on an evening walk.

Design:
small round bird, soft buncho-inspired shape, slightly lowered posture, wing held close to chest, large reflective eyes, tiny rounded beak, compact body, soft blue base color, small lavender accent, simple readable silhouette, no complex details.

Mood:
少し切ない, 静かな夕方, 寄り添う, 帰り道.

Style:
soft Japanese mascot style, picture-book feeling, sticker-ready, clean rounded outline, soft flat colors, minimal gentle shading, transparent background, no text, no extra characters.
```

---

# minor ネガティブ補足

```text
not gloomy, not crying too much, not dark horror, not realistic bird, not human-like, not detailed feathers, not overly blue, not complex costume
```

---

# 7 プロンプト

```text
Create a cute original Codori bird mascot representing the dominant seventh chord feeling.

The character should feel playful, active, a little mischievous, lively, and eager to move forward.
It should feel like the moment just before going somewhere exciting.

Design:
small round bird, crow-inspired but still very cute, tilted body posture, one short rounded wing raised, lively eyes, tiny confident beak smile, compact readable silhouette, dark charcoal or soft black base with warm accent, or mint green body with orange accent if a brighter version is preferred, no scary expression.

Mood:
次に行きたがる, いたずら, ライブ前, わくわく.

Style:
soft Japanese mascot style, picture-book feeling, sticker-ready, clean rounded outline, soft flat colors, minimal gentle shading, transparent background, no text, no extra characters.
```

---

# 7 ネガティブ補足

```text
not scary crow, not villain, not aggressive, not too realistic, not gothic, not complex feathers, not sharp claws, not noisy background
```

---

# add9 プロンプト

```text
Create a cute original Codori bird mascot representing the add9 chord feeling.

The character should feel sparkling, airy, youthful, transparent, curious, and slightly dreamy.
It should feel like looking up at a clear night sky with small stars.

Design:
small round blue bird, light and airy posture, slightly upward gaze, large curious eyes, tiny rounded beak, short rounded wings, simple star accessory or tiny star-note motif, pale sky blue or clear aqua base color, soft white accent, rounded silhouette, no complex details.

Mood:
きらきら, 青春, 夜空, 澄んだ空気, わぁ.

Style:
soft Japanese mascot style, picture-book feeling, sticker-ready, clean rounded outline, soft flat colors, minimal gentle shading, transparent background, no text, no extra characters.
```

---

# add9 ネガティブ補足

```text
not magical girl, not overly fantasy, not too many stars, not space background, not complex costume, not glowing too much, not corporate mascot, not realistic bird
```

---

# 比較生成プロンプト

4鳥を同じ絵柄で比較したいときに使う。

```text
Create a simple character lineup of four original Codori bird mascots: Major, minor, dominant seventh, and add9.

They should look like they belong to the same world and share the same art style, head-body proportion, line thickness, and softness.

Major: warm, bright, stable, soft yellow cream bird.
minor: tender, quiet, slightly sad, soft blue bird.
dominant seventh: playful, active, slightly mischievous, tilted pose bird.
add9: sparkling, airy, curious, pale sky blue bird with tiny star motif.

All should be small round bird mascots with simple readable silhouettes, big gentle eyes, tiny rounded beaks, short rounded wings, soft Japanese mascot style, picture-book feeling, sticker-ready, transparent background, no text, no complex music notation.
```

---

# 白黒シルエット確認用プロンプト

```text
Create a black and white silhouette test sheet for four cute Codori bird mascots: Major, minor, dominant seventh, and add9.

No color. No text. Only simple filled silhouettes.

Each silhouette should be clearly different:
Major: stable round standing pose.
minor: slightly tucked quiet posture.
dominant seventh: tilted active pose with raised wing.
add9: light upward-looking pose with small star shape.

Keep all characters in the same cute rounded mascot style.
```

---

# 採用チェックリスト

画像生成後は以下を確認する。

## 共通

- 小サイズで顔が読めるか
- シルエットが単純か
- 線が細すぎないか
- 背景なしで成立するか
- 音楽記号が多すぎないか

---

## Major

- 安心感があるか
- 世界の基準にできるか
- 元気すぎないか

---

## minor

- 切なさがあるか
- 暗くなりすぎていないか
- Majorと色以外でも差があるか

---

## 7

- 動きがあるか
- 怖いカラスになっていないか
- いたずら感がかわいいか

---

## add9

- きらきら感があるか
- 星が多すぎないか
- Codoriらしい透明感があるか

---

# 次の作業

1. Majorを多めに生成
2. 良い方向を3案選ぶ
3. minor / 7 / add9へ展開
4. 4鳥を並べる
5. 白黒シルエット化して比較
6. 採用候補を決める

---

# 未決事項

- 7鳥を黒系にするか明るい色にするか
- add9の星をアクセサリにするかエフェクトにするか
- Majorのシマエナガ感をどこまで強めるか
- minorを文鳥寄りにするか抽象小鳥寄りにするか
