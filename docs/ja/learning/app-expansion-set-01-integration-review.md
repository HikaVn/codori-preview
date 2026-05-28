# Codori Expansion Set 01 アプリ統合レビュー

## このファイルについて

このファイルは、Expansion Set 01をアプリへ統合した結果を記録するレビューです。

対象：

```text
F
G
Am
Dm
Em
G7
A7
D7
```

---

# 統合方針

初期4コードは既存MVPとして維持する。

```text
C
Cm
C7
Cadd9
```

Expansion Set 01は、初期4コードへ直接混ぜず、
セット切り替えで表示する。

アプリ上の表示名：

```text
はじめの4羽
Cのまわり
```

---

# 学習上の意味

Expansion Set 01は、単なる追加コードではなく、
Cメジャー周辺のダイアトニック入門として扱う。

```text
C / Dm / Em / F / G / Am
```

ただしアプリのExpansion Set 01自体には、初期セットにすでに存在する `C` は重複して入れない。
そのため、Expansion Set 01の画面では以下を表示する。

```text
F / G / Am / Dm / Em / G7
A7 / D7
```

`A7 / D7 / G7` は、7鳥が次へ案内する道しるべとして扱う。

```text
A7 -> Dm
D7 -> G
G7 -> C
```

---

# 確認済み

- 初期表示は `はじめの4羽`
- `Cのまわり` を選ぶとExpansion Set 01へ切り替わる
- カード画面で8コードが表示される
- 聞き比べ画面で8コードが表示される
- 音あて画面で8コードが選択肢になる
- クイズは音を聞く前に選択肢が押せない
- Web Audio仮音源を継続使用
- 鳥種、表情、基本ポーズはキーで変えない
- キー違いは色で表す
- A7 / D7は既存7鳥を使う
- PC幅とスマホ幅で大きな表示崩れなし

確認画像：

```text
assets/app/review/mvp-current-2026-05-22/desktop-initial-set-card.png
assets/app/review/mvp-current-2026-05-22/desktop-expansion-set-card.png
assets/app/review/mvp-current-2026-05-22/mobile-expansion-set-compare.png
assets/app/review/mvp-current-2026-05-22/desktop-expansion-set-quiz.png
assets/app/review/mvp-current-2026-05-22/mobile-expansion-set-quiz.png
```

---

# 今回やっていないこと

- `Bdim` の追加
- 新キャラ追加
- 12キー展開
- 音源制作
- LINEスタンプ量産

---

# 次の判断ポイント

- `Cのまわり` という名称で、ダイアトニック入門の意図が伝わるか
- Expansion Set 01に `C` を重複表示しない方針でよいか
- 先に `m7 / maj7` などジャズ寄りダイアトニックの鳥種設計へ進むか
- Web Audio仮音源の音色や余韻をこのままにするか
