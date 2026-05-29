# Codori 白い鳥アクション差分 制作ブリーフ

## このファイルについて

このファイルは、元の白い鳥を本番キャラクターとして使い、コード種類をアクション違いで表すための制作ブリーフです。

正本：

```text
docs/ja/core/white-bird-action-system.md
```

## 結論

次に作るべきものは、新しい鳥種ではなく、元の白い鳥のアクション差分です。

最初の制作対象は、以下の4つを推奨する。

```text
1. Major / 安心して立つ
2. minor / そっと寄り添う
3. 7 / 次へ誘う
4. add9 / きらっと見上げる
```

LINE展開の前に、他のコード種類も先に完成させる。

```text
5. m7 / 夜にほどける
6. maj7 / 透明にたたずむ
7. mM7 / 宿命を見つめる
8. sus4 / まだ待っている
9. m7-5 / 振り向きざまにちらっと見る
10. dim / きゅっと固まる
11. aug / ふわっと驚く
```

LINE前の完成計画は以下を正とする。

```text
docs/ja/characters/pre-line-chord-action-completion-plan.md
```

## 共通ルール

- 鳥種はすべて元の白い鳥にする。
- 体型、顔の基本比率、くちばし、足、線の太さは大きく変えない。
- コード種類は、表情、目線、羽、重心、体の傾きで表す。
- キー違いでは、アクションを変えない。
- キー違いは色だけで表す。

## 初期4アクション

| コード種類 | アクション | 画像で出す差 |
|---|---|---|
| Major | 安心して立つ | 正面寄り、安定、ほっとする顔 |
| minor | そっと寄り添う | 少し伏し目、羽を内側へ、控えめ |
| 7 | 次へ誘う | 片羽を少し上げる、前向き、いたずらっぽい |
| add9 | きらっと見上げる | 上向き、軽く伸びる、澄んだ目 |

## 追加アクション

| コード種類 | アクション | 画像で出す差 |
|---|---|---|
| m7 | 夜にほどける | 半目寄り、力を抜く、minorよりやわらかい |
| maj7 | 透明にたたずむ | 静かに遠くを見る、背筋を少し伸ばす |
| mM7 | 宿命を見つめる | 影のある目、静かな覚悟、黒鳥化しない |
| sus4 | まだ待っている | 片足または体を少し浮かせる、保留感 |
| m7-5 | 振り向きざまにちらっと見る | 嘴の下に口線を入れない、半目、頬のバッテン傷 |
| dim | きゅっと固まる | 小さくまとまる、不思議だが怖くしない |
| aug | ふわっと驚く | 少しふくらむ、浮く、夢っぽい |

## 初回生成プロンプト方針

まずは1枚のシートに、元の白い鳥の4アクションを並べる。

```text
Codori white bird mascot, same character in four action variants,
soft picture-book Japanese mascot style, thick rounded outline,
simple white bird body, same face proportions, same beak, same feet,
no different bird species, no costume, no complex props,
plain warm off-white background, no text.

Variant 1 Major: standing calmly, relaxed smile, stable front-facing posture.
Variant 2 minor: slightly inward, wings close to chest, gentle downcast eyes, not crying.
Variant 3 seventh: one wing slightly raised, playful forward feeling, not angry.
Variant 4 add9: looking slightly upward, light lifted posture, clear bright eyes, no excessive stars.
```

禁止：

```text
no different bird species, no crow, no swan, no penguin, no owl,
no black bird, no realistic feathers, no costume, no text,
no chord diagram, no musical notes covering the bird,
no strong color change between variants
```

## 採用判断

初回生成後は、以下を見る。

- 同じ白い鳥に見えるか。
- コード種類ごとのアクション差が読めるか。
- 96pxでも見分けられるか。
- キー色を重ねても、アクションが崩れないか。
- 旧4鳥よりIPとして統一感が出ているか。
