# Codori A7 / D7 アプリ統合レビュー

## このファイルについて

このファイルは、A7 / D7を既存7鳥のキー展開としてアプリに追加した結果を記録するレビューです。

## 追加したコード

```text
A7
D7
```

どちらも新キャラではなく、既存の7鳥を使う。

```text
A7 = 7鳥 + A7表示 + A7運指
D7 = 7鳥 + D7表示 + D7運指
```

## 学習上の意味

7鳥の役割を、単なるC7の違いではなく「次へ案内する鳥」として強くする。

```text
A7 -> Dm = 静かな小道へ背中を押す風
D7 -> G  = 前向きな風へ走り出す合図
G7 -> C  = Cへ帰りたくなる帰り道の合図
```

## D7フォーム判断

アプリ主表示は`2020`にした。

理由：

- 初心者が押さえやすい
- A7やG7と並べたときに、7鳥の「次へ行く」感情を先に覚えやすい
- まず音・名前・運指・鳥をつなげるMVP目的に合う

`2223`は、将来の比較候補としてデータに残す。

## 追加・更新したアセット

```text
assets/app/fingering/expansion-set-01/ukulele_A7_vertical_strings.svg
assets/app/fingering/expansion-set-01/ukulele_D7_vertical_strings.svg
assets/app/data/expansion-set-01.json
```

## 画面反映

`Cのまわり`セットに、道しるべを表示する。

```text
A7 -> Dm
D7 -> G
G7 -> C
```

カード、ききくらべ、音あては、Expansion Set 01のデータを読み込んでセット単位で動く。

## 確認ポイント

- 鳥種、表情、基本ポーズはキーで変えていない
- キー違いは色で表す
- A7 / D7は既存7鳥を使っている
- 運指画像は弦が上下方向
- Web Audio仮音源を使う
- 新キャラ、12キー展開、音源制作、LINE量産には進んでいない

## 確認画像

```text
assets/app/review/a7-d7-2026-05-23/desktop-expansion-card-final.png
assets/app/review/a7-d7-2026-05-23/mobile-expansion-compare-final-2.png
assets/app/review/a7-d7-2026-05-23/mobile-expansion-quiz-final-2.png
```

確認結果：

- PC幅では、セット名、道しるべ、カード表示が見える
- スマホ幅では、タブを縦並びにして読みやすさを優先した
- `1 / 8`表示により、Expansion Set 01が8コード構成になっていることを確認できる

## 未決事項

- D7の`2223`をいつ比較表示するか
- 次にE7を入れるか
- `7鳥の道`として別セット化するか、このまま`Cのまわり`に残すか
