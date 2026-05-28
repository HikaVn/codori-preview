# Codori m7 / maj7 / mM7 制作ブリーフ

## このファイルについて

2026-05-27時点で、このファイルの「m7=夜雀、maj7=白鳥、mM7=黒鳥」として別鳥種を作る方針はボツです。
本番では、元の白い鳥のアクション差分でコード種類を表します。

新しい正本：

```text
docs/ja/core/white-bird-action-system.md
docs/ja/characters/white-bird-action-production-brief.md
```

このファイルは、次期正式鳥として検討する `m7`、`maj7`、`mM7` の見分け方を、画像生成前に固定するための制作ブリーフです。

正本の優先順位は以下です。

```text
1. docs/ja/characters/chord-expression-and-key-color-policy.md
2. docs/ja/core/chord-family-bird-mapping-policy.md
3. このファイル
```

## 旧結論

以下は旧方針です。
本番方針としては採用しません。

次期正式鳥は、以下の順で制作・確認する。

| 優先順 | コード種類 | 鳥種 | 中心イメージ | 制作状態 |
|---|---|---|---|---|
| 1 | m7 | 夜雀 | 夜にほどける余韻 | 正式候補制作へ進める |
| 2 | maj7 | 白鳥 | 透明で上品な静けさ | m7と並行または直後に制作 |
| 3 | mM7 | 黒鳥 | ミステリーかつ過酷な運命 | m7 / maj7の差分確定後に制作 |

キー違いは色で表す。
鳥種、表情、基本ポーズ、シルエットはキーで変えない。

## 3種類の差分

| 観点 | m7 / 夜雀 | maj7 / 白鳥 | mM7 / 黒鳥 |
|---|---|---|---|
| 音の印象 | minorがほどけた夜 | Majorが透明に浮く | minorに張りつめたmaj7が乗る |
| 感情 | 余韻、脱力、やわらかさ | 上品、清潔、遠い光 | 宿命、覚悟、静かな緊張 |
| 目線 | 少し伏し目、半目寄り | 遠くを見る、穏やか | 遠くを見る、影がある |
| 口元 | ふっと緩む | 静かな微笑み | 閉じ気味、覚悟がある |
| 姿勢 | 力を抜いて座る/立つ | 首筋を少し長く、品よく | 静かに張りつめる |
| 明度 | 暗くしすぎない夜色 | 白を基準に淡い青 | 黒を基準に深い青紫 |
| NG | 悲しすぎる、黒鳥化する | add9のきらきらに寄る | ホラー化、dim化、悪役化 |

## m7 / 夜雀

### 役割

`minor`よりも悲しみがほどけ、夜に流れていく音として扱う。

m7単体の画像生成プロンプトは以下に分ける。

```text
docs/ja/characters/m7-night-sparrow-generation-prompts.md
```

初回生成レビューは以下に記録する。

```text
docs/ja/characters/m7-night-sparrow-formal-candidate-review.md
```

### デザイン固定

- 小さく丸い夜の鳥。
- 目は半目寄りだが、眠いだけにはしない。
- minor鳥よりも肩の力を抜く。
- 7鳥のように前へ誘わない。
- add9のような星・光の多用は避ける。
- 色は夜色を使うが、黒鳥に見えるほど暗くしない。

### 制作キーワード

```text
夜、余韻、しっとり、やわらかい脱力、安心できる暗さ
```

### 画像生成時の方向

```text
Codori style mascot bird, small round night sparrow, relaxed soft expression,
half-lidded gentle eyes, tiny calm beak, cozy night mood, simple silhouette,
soft deep blue accent, warm and cute, readable at small icon size,
no realistic feathers, no scary mood, no excessive stars
```

## maj7 / 白鳥

### 役割

`Major`よりも大人っぽく、透明に浮く音として扱う。

### デザイン固定

- 白鳥らしさは首の流れで出す。
- 首は長くしすぎず、小サイズでも顔が読める長さにする。
- add9のような星感ではなく、静かな光で表す。
- Major鳥より上品だが、冷たすぎない。
- ロゴ用の白鳥アイコンとは同一デザインにしない。

### 制作キーワード

```text
透明感、上品、静かな光、夜景、ガラス、白い余白
```

### 画像生成時の方向

```text
Codori style mascot bird, elegant simplified swan, transparent and calm mood,
soft white body, gentle distant eyes, tiny quiet smile, simple curved neck,
deep blue and pale blue small accents, cute and readable at small icon size,
not realistic, not overly long neck, no flashy sparkles
```

## mM7 / 黒鳥

### 役割

`minor`の静けさに、`maj7`の張りつめた光が入る音として扱う。

ミステリーかつ過酷な運命。
悲しみや怖さではなく、避けられない運命を静かに見つめる覚悟を中心にする。

### デザイン固定

- 黒鳥方向で扱う。
- 黒は強くしすぎず、Deep Blue、青紫、墨色でやわらげる。
- m7のほどける感じは入れない。
- maj7の透明感だけで終わらせない。
- dimのミステリーよりも、ホラーではなく宿命感を優先する。
- 悪役顔にしない。

### 制作キーワード

```text
ミステリー、過酷な運命、静かな覚悟、月明かり、影のある湖
```

### 画像生成時の方向

```text
Codori style mascot bird, elegant black swan, mysterious and fateful mood,
quiet determined eyes looking far away, closed calm beak, deep blue black body,
subtle violet shadow, moonlit stillness, simple silhouette, cute but solemn,
not horror, not villain, not realistic, no aggressive expression
```

## 並べたときの確認基準

正式候補を作ったら、初期4鳥と並べて以下を確認する。

- `minor`と`m7`が、悲しさとほどける余韻として分かれるか。
- `Major`と`maj7`が、安心感と透明感として分かれるか。
- `add9`と`maj7`が、きらめきと上品さとして分かれるか。
- `m7`と`mM7`が、脱力と覚悟として分かれるか。
- `maj7`と`mM7`が、透明感と宿命感として分かれるか。
- `dim`候補と`mM7`が、不思議さと過酷な運命として分かれるか。
- 96px以下でも、鳥種と表情差が読めるか。
- LINE 370x320でも、コード名と一緒に見て強すぎないか。

## 旧採用判断

以下は旧採用判断です。
本番方針としては撤回します。

```text
m7  : 夜雀方向で正式候補制作へ進める。
maj7: 白鳥方向で正式候補制作へ進める。
mM7 : 黒鳥方向で確定。ただし正式制作はm7 / maj7の後。
```

2026-05-27時点では、まだ正式画像を`assets/approved/characters/`へ追加しない。
正式候補画像を作り、既存4鳥と並べてレビューしてから採用する。
