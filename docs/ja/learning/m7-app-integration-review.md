# Codori m7 アプリ統合レビュー

## このファイルについて

このファイルは、次のコード種類として`m7`をアプリに仮実装した結果を記録するレビューです。

## 追加したコード種類

```text
m7
```

鳥種候補：

```text
夜雀
```

感情：

```text
夜、余韻、エモい、minorより少しほどける
```

## 追加したコード

```text
Am7
Dm7
Em7
```

## 学習上の意味

m7は、minorの切なさをそのまま強くするのではなく、少し力が抜けて余韻が残る響きとして扱う。

```text
Am7 = 夜にふっとほどける
Dm7 = 静かな道がやわらぐ
Em7 = 影がさらっと流れる
```

## アセット方針

正式m7鳥はまだ画像生成しない。

今回はアプリ学習確認用に、仮の夜雀SVGを使う。

```text
assets/app/characters/provisional/m7-night-sparrow.svg
```

正式m7鳥を採用したら、`assets/approved/characters/` 側へ差し替える。

## 追加・更新したアセット

```text
assets/app/data/m7-set-01.json
assets/app/fingering/m7-set-01/ukulele_Am7_vertical_strings.svg
assets/app/fingering/m7-set-01/ukulele_Dm7_vertical_strings.svg
assets/app/fingering/m7-set-01/ukulele_Em7_vertical_strings.svg
assets/app/characters/provisional/m7-night-sparrow.svg
```

## アプリ反映

セット切り替えに以下を追加した。

```text
m7の夜
```

カード、ききくらべ、音あては、既存の仕組みでセット単位に動く。

## 確認ポイント

- `m7`は新しいコード種類として扱う
- 音名違いで鳥種、表情、基本ポーズは変えない
- キー違いは色で表す
- `Am7 / Dm7 / Em7` は同じm7鳥を使う
- 鳥画像と運指画像は別アセット
- 音源制作は行わず、Web Audio仮音源を使う

## 確認画像

```text
assets/app/review/m7-set-01-2026-05-23/desktop-m7-card-final.png
assets/app/review/m7-set-01-2026-05-23/mobile-m7-compare-final.png
assets/app/review/m7-set-01-2026-05-23/mobile-m7-quiz-final.png
```

確認結果：

- PC幅では、m7鳥、コード名、運指画像、再生ボタンが同じカード内で確認できる
- スマホ幅では、セット切り替えとタブを縦並びにして、横はみ出しを避けた
- `1 / 3`表示により、m7入門セットが3コード構成であることを確認できる

## 未決事項

- m7鳥の正式デザインをいつ画像生成するか
- m7鳥を夜雀で正式固定するか
- `Cm7`を追加するか
- 次に`maj7`へ進むか、`sus4`へ進むか
