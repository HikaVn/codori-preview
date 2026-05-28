# Codori 練習モードMVP実装レビュー

## このファイルについて

このファイルは、`docs/ja/learning/practice-mode-mvp-spec.md` に基づいて実装した練習モードMVPの確認記録です。

実装対象：

```text
app/
assets/app/data/practice-stages.json
```

---

# 実装内容

## 練習ステージ選択

アプリ上部に「れんしゅうの森」を追加し、以下の4ステージを選べるようにした。

```text
Stage 0: Cでコード種類をさらう
Stage 1: Cのまわりの仲間
Stage 2: 7鳥の道しるべ
Stage 5: よくある進行の森
```

初期表示はStage 0。

図鑑セット切り替えは残しつつ、練習ステージとは別の導線として扱う。

## 練習データ

新規作成：

```text
assets/app/data/practice-stages.json
```

練習ステージ側では、コード本体を重複定義しない。
既存の以下データから、表示名またはコードIDで参照する。

```text
assets/app/data/initial-four-chords.json
assets/app/data/expansion-set-01.json
```

## 対応画面

既存の画面：

```text
音カード
ききくらべ
音あて
```

新規追加：

```text
進行練習
```

進行練習では、コード進行、鳥の並び、コードごとの再生ボタン、運指画像、進行まとめ再生を表示する。

---

# Stage別の扱い

## Stage 0

対象：

```text
C
Cm
C7
Cadd9
```

目的：

```text
同じCでも、コード種類が変わると音のきもちと鳥が変わることを知る。
```

進行練習はまだ薄く扱い、音カード・ききくらべ・音あてを中心にする。

## Stage 1

対象：

```text
C
Dm
Em
F
G
Am
G7
```

目的：

```text
Cのまわりの基本コードを、小さな仲間として覚える。
```

代表進行：

```text
C -> F -> G -> C
C -> Am -> F -> G
Dm -> G7 -> C
```

## Stage 2

対象：

```text
A7
Dm
D7
G
G7
C
```

目的：

```text
7鳥が次の場所へ進みたがる感じを覚える。
```

代表進行：

```text
A7 -> Dm
D7 -> G
G7 -> C
A7 -> Dm -> G7 -> C
```

## Stage 5

対象：

```text
C
G
Am
F
Em
Dm
G7
```

目的：

```text
コードを単体ではなく、曲でよく出る流れとして覚える。
```

代表進行：

```text
C -> G -> Am -> F
C -> Am -> F -> G
F -> G -> Em -> Am
Dm -> G7 -> C
```

---

# 確認ポイント

- 鳥だけを当てるクイズにはしていない。
- 音あてでは、鳥と再生ボタンを同時に表示する。
- 回答後にコード名、鳥、運指、きもちを確認できる。
- 進行練習では、コード名だけでなく鳥の並びも見える。
- Web Audio仮音源を引き続き使用する。
- 音声ファイル制作は行っていない。
- 新キャラ追加は行っていない。

確認画像：

```text
assets/app/review/practice-mode-mvp-2026-05-23/desktop-stage0-card.png
assets/app/review/practice-mode-mvp-2026-05-23/mobile-stage2-quiz.png
assets/app/review/practice-mode-mvp-2026-05-23/mobile-stage5-progression.png
```

確認結果：

- PC幅でStage 0の音カードが表示できる。
- スマホ幅でStage 2の音あてが表示できる。
- スマホ幅でStage 5の進行練習が表示できる。
- 練習中は図鑑パネルを畳み、必要なときだけ「図鑑を見る」から戻る。
- Stage 5では、進行名、進行コード列、まとめ再生、感情メモ、鳥の並びを確認できる。

---

# 初回学習体験の調整

2026-05-23に、初心者が最初に触る画面として迷いにくくなるように以下を調整した。

## 導線

- 練習ステージの各ボタンに、対象音数と練習の性格を短く表示した。
- 練習中の図鑑導線を「図鑑でさがす」に変更した。
- 図鑑パネルは練習中に畳み、図鑑を見るときだけ開く扱いを維持した。

## 練習タブ

各タブに短い補助ラベルを追加した。

```text
音カード: 1つずつ
ききくらべ: ちがい
音あて: 思い出す
進行練習: 流れ
```

さらに、現在のタブの役割を短く表示するガイドを追加した。
目的は、操作説明を増やすことではなく、
「今は何を感じる時間か」をすぐ思い出せるようにすること。

## Stage文言

Stage 0 / Stage 1 / Stage 2 / Stage 5の文言を、以下の方向へ寄せた。

- Stage 0: 同じCの中で、鳥ときもちが変わる入口。
- Stage 1: Cへ帰れる小さな森。
- Stage 2: 7鳥は行き先とセットで聞く。
- Stage 5: コード名の丸暗記ではなく、感情の流れとして聞く。

## 進行練習

- Stage 0では進行練習タブを無効化し、まず1音ずつ聞く導線にした。
- Stage 1 / Stage 2 / Stage 5では進行練習を使える。
- Stage 5の文言は「コードの並び」より「曲の景色」「感情の流れ」を優先した。

確認画像：

```text
assets/app/review/practice-mode-polish-2026-05-23/desktop-stage0-card.png
assets/app/review/practice-mode-polish-2026-05-23/mobile-stage2-quiz.png
assets/app/review/practice-mode-polish-2026-05-23/mobile-stage5-progression.png
```

---

# 未決事項

- Stage 0で後続コード種類をいつ開くか。
- Stage 2にE7をいつ追加するか。
- Stage 5の最初のおすすめ進行をどれにするか。
- 図鑑の検索結果から練習ステージへ送る導線をいつ作るか。
- 実機スマホでのタップ感を確認する。

---

# 最小進捗の追加

2026-05-23に、練習モードへ最小進捗を追加した。

保存先：

```text
localStorage
```

保存キー：

```text
codori.practiceProgress.v1
```

保存するもの：

```text
聞いた
音あてした
進行を聞いた
最後に開いていたStage
最後に開いていたタブ
最後に見ていたカード位置
最後に選んだ進行
```

表示：

- 各Stageボタンに羽あと数を表示する。
- 選択中Stageに「聞いた」「音あて」「進行」の小さなバッジを表示する。
- 選択中Stageに「つづきから」を表示し、最後に見ていたタブ、カード、進行を示す。
- URLでStageやsetが指定されていない場合、最後に開いていたStage / タブへ戻る。
- 「このStageの羽あとを消す」ボタンを追加し、確認ダイアログ後にStage単位で進捗を削除できるようにした。

確認画像：

```text
assets/app/review/practice-progress-2026-05-23/desktop-stage0-progress.png
assets/app/review/practice-progress-2026-05-23/mobile-stage5-progress.png
assets/app/review/practice-progress-reset-2026-05-23/mobile-stage0-reset-empty.png
assets/app/review/practice-progress-reset-2026-05-23/mobile-stage5-reset-filled.png
```

注意：

- これはMVP用のローカル保存であり、ユーザーアカウントやクラウド同期ではない。
- 正解率を評価する機能ではなく、戻ってきたときに続きから歩くための羽あととして扱う。

---

# 次の候補

次は、実機またはブラウザ確認後に以下へ進める。

```text
練習モードMVPの操作感を見て、Stage 0 / Stage 1 / Stage 2 / Stage 5の文言・余白・進行表示を微調整する。
```

---

# 初回導線の調整

2026-05-23に、初回ユーザーが迷わず始められるように練習モードを微調整した。

調整内容：

- カード画面の再生ボタンに「音をきく」を表示した。
- Stage 0の歩き方を「音をきく -> つぎへ -> 音あて」として明示した。
- 音カード / ききくらべ / 音あて / 進行練習ごとに、画面上部の短い案内を切り替えるようにした。
- 図鑑モードでは「探す場所」、練習モードでは「覚える場所」と伝える文言にした。

確認観点：

- 初回に押すボタンが青い「音をきく」だと分かる。
- Stage 0で4羽を順番に聞いてから、音あてへ進める。
- 羽あととつづきから表示が、学習の続きとして見える。
- スマホ幅で進捗、タブ、再生ボタンが画面内に収まる。

確認画像：

```text
assets/app/review/first-user-flow-2026-05-23/desktop-stage0-card.png
assets/app/review/first-user-flow-2026-05-23/mobile-stage0-card.png
assets/app/review/first-user-flow-2026-05-23/mobile-stage0-quiz-after-play.png
```

---

# Stage 1 / 2 / 5の文言調整

2026-05-23に、Stage 1 / Stage 2 / Stage 5を、初心者が順番に進みたくなる言葉へ微調整した。
Stage 0の初回導線は維持した。

調整方針：

- Stage 1は「Cのまわりの仲間」として、Cへ帰れる安心感を中心にする。
- Stage 2は「7鳥の行き先」として、7コード単体より行き先セットを中心にする。
- Stage 5は「曲の景色」として、コード名の丸暗記より感情の流れを中心にする。

アプリ内で調整した文言：

- Stage説明
- Stageのmood
- 進行練習メモ
- 音カード / ききくらべ / 音あて / 進行練習の上部ガイド
- 音あて開始前と再生後の案内文

確認観点：

- Stage 1で、C / Dm / Em / F / G / Am / G7が「Cのまわりの仲間」に見える。
- Stage 2で、A7 -> Dm、D7 -> G、G7 -> Cが行き先として伝わる。
- Stage 5で、進行がコード列ではなく曲の景色として読める。
- Stage 0の「音をきく -> つぎへ -> 音あて」導線は崩れていない。

確認画像：

```text
assets/app/review/stage-wording-2026-05-23/mobile-stage1-card.png
assets/app/review/stage-wording-2026-05-23/mobile-stage2-quiz.png
assets/app/review/stage-wording-2026-05-23/mobile-stage5-progression.png
assets/app/review/stage-wording-2026-05-23/mobile-stage0-card-regression.png
```

---

# Stage 0〜10の追加

2026-05-23に、練習モードでStage 0〜10を一通り選べる状態にした。

追加したStage：

```text
Stage 3: Cメジャーのジャズ寄りダイアトニック
Stage 4: キーを変えてみる
Stage 6: sus4とadd9の色づけ
Stage 7: minorキーの入口
Stage 8: ブルージーな7の森
Stage 9: dim / aug / m7-5 の不思議な森
Stage 10: 全コード図鑑を使う
```

実装方針：

- 新キャラ画像は生成しない。
- 既存正式4鳥と仮SVG素材を使う。
- Web Audio仮音源を使う。
- Stage 10は全132コードを一気に出題せず、Cの11種類で図鑑の使い方を確認する入口にする。
- 初心者の推奨順は引き続き `Stage 0 -> Stage 1 -> Stage 2 -> Stage 5` とする。

確認観点：

- Stage 0〜10がアプリ上に表示される。
- 各Stageの`code_ids`と進行の参照先が存在する。
- Stage 3以降でも、カード / ききくらべ / 音あて / 進行練習が破綻しない。
- Stage 10では進行練習を無効化し、図鑑の入口として扱う。

確認画像：

```text
assets/app/review/stage-complete-2026-05-23/mobile-stage-list-0-10.png
assets/app/review/stage-complete-2026-05-23/mobile-stage3-progression.png
assets/app/review/stage-complete-2026-05-23/mobile-stage6-quiz.png
assets/app/review/stage-complete-2026-05-23/mobile-stage10-card.png
```

---

# 推奨順ともっと歩く森

2026-05-23に、Stage 0〜10の表示を初心者向けに整理した。

表示グループ：

```text
おすすめの道:
Stage 0 / Stage 1 / Stage 2 / Stage 5

もっと歩く森:
Stage 3 / Stage 4 / Stage 6 / Stage 7 / Stage 8 / Stage 9 / Stage 10
```

実装方針：

- Stage 0 / 1 / 2 / 5を先に表示し、「おすすめ」バッジをつける。
- Stage 3以降は「もっと歩く」バッジをつける。
- ロック解除風の見せ方にするが、実際には選択可能にする。
- 目的は制限ではなく、初心者が最初の道に迷わないこと。

確認結果：

- スマホ幅で「おすすめの道」「もっと歩く森」が表示される。
- Stage 0 / 1 / 2 / 5が先に並ぶ。
- Stage 3 / 4 / 6 / 7 / 8 / 9 / 10は「もっと歩く」バッジつきで選択可能。
- 選択中Stageに合わせて、下部注記が「おすすめの道」または「もっと歩く森」へ切り替わる。

確認画像：

```text
assets/app/review/stage-recommendation-2026-05-23/mobile-recommended-stage0-cdp.png
assets/app/review/stage-recommendation-2026-05-23/mobile-more-stage3.png
```

---

# 次の森へ導線

2026-05-23に、羽あとがそろったStageで「次の森へ」案内を表示するようにした。

案内順：

```text
Stage 0 -> Stage 1 -> Stage 2 -> Stage 5 -> Stage 3 -> Stage 4 -> Stage 6 -> Stage 7 -> Stage 8 -> Stage 9 -> Stage 10
```

Stage 10完了後は、次のStageではなく図鑑モードへ案内する。

完了条件：

- 進行練習があるStageは、`聞いた / 音あて / 進行` がそろったら完了。
- 進行練習がないStageは、`聞いた / 音あて` がそろったら完了。

実装方針：

- 実ロックはしない。
- 次のStage案内は、学習の背中を押す小さな道しるべとして扱う。
- Stage 5完了後は「おすすめの道を歩ききった」文脈で、もっと歩く森のStage 3へ案内する。

確認結果：

- スマホ幅でStage 0完了後、Stage 1「Cのまわり」への案内が表示される。
- スマホ幅でStage 5完了後、「おすすめの道を歩ききった」案内からStage 3「夜のC」へ進める。
- スマホ幅でStage 10完了後、次Stageではなく図鑑モードへ戻る案内が表示される。
- Stage 0 / Stage 10は進行練習がないため、羽あと `2 / 2` で完了扱いにする。
- 進行練習があるStageは、羽あと `3 / 3` で完了扱いにする。
- Stageボタン、羽あと、つづきから、次の森案内はスマホ幅で大きな崩れなし。

確認画像：

```text
assets/app/review/next-stage-guide-2026-05-23/mobile-stage0-next.png
assets/app/review/next-stage-guide-2026-05-23/mobile-stage5-next.png
assets/app/review/next-stage-guide-2026-05-23/mobile-stage10-next.png
```

---

# 初回ルート通し確認

2026-05-23に、Stage 0からおすすめの道を歩き、もっと歩く森へ入る流れをスマホ幅で通し確認した。

確認ルート：

```text
Stage 0 -> Stage 1 -> Stage 2 -> Stage 5 -> Stage 3
```

微調整：

- スマホ幅ではStageボタンを2列表示にし、練習本体までの距離を短くした。
- スマホ幅では練習タブを2列表示にし、音カード / ききくらべ / 音あて / 進行練習を見渡しやすくした。
- 「次の森へ: Cのまわり」のような機械的な表記を、「Cのまわりへ進む」に変更した。
- おすすめ順の注記を `Stage 0 -> 1 -> 2 -> 5` ではなく、「まずは0、1、2、5の順にゆっくり」に変更した。
- 進行練習の連続再生中に次Stageへ移動しても、前Stageの再生が次Stageの羽あとに混ざらないようにした。

確認結果：

- Stage 0完了後、Stage 1「Cのまわり」へ進める。
- Stage 1完了後、Stage 2「7鳥の道」へ進める。
- Stage 2完了後、Stage 5「進行の森」へ進める。
- Stage 5完了後、もっと歩く森のStage 3「夜のC」へ進める。
- Stage移動直後は、次Stageの羽あとが空の状態で始まる。
- スマホ幅で横はみ出しなし。

確認画像：

```text
assets/app/review/first-route-flow-2026-05-23/stage0-guide-polished.png
assets/app/review/first-route-flow-2026-05-23/stage1-guide-polished.png
assets/app/review/first-route-flow-2026-05-23/stage2-guide-polished.png
assets/app/review/first-route-flow-2026-05-23/stage5-guide-polished.png
assets/app/review/first-route-flow-2026-05-23/stage3-after-click-polished.png
```

---

# もっと歩く森の文言調整

2026-05-23に、Stage 3以降を「上級テスト」ではなく、初心者が気になった響きをのぞける寄り道として読めるように調整した。

対象：

```text
Stage 3 / Stage 4 / Stage 6 / Stage 7 / Stage 8 / Stage 9 / Stage 10
```

調整方針：

- 理論名は消さず、最初に読む文では感情と景色を優先する。
- 「不安定」「暗い」「ジャズ」などの硬く見える言葉は、灯り、余韻、ゆれ、寄り道、きらめきに置き換える。
- Stage 10は「132コードを覚える場所」ではなく、「必要な鳥を探す図鑑」として伝える。
- 図鑑モードは探す場所、練習モードは聞いて覚える場所として分ける。
- 練習中の「図鑑でさがす」は、全コード図鑑へ戻る入口として扱う。

Stage別の寄せ方：

```text
Stage 3: ジャズ寄り理論より、夜の灯りとして聞く。
Stage 4: キー変更より、鳥の住む枝が変わる旅として見る。
Stage 6: sus4 / add9を、浮く羽ときらめく羽として聞く。
Stage 7: minorキーを、暗さではなく静かな帰り道として聞く。
Stage 8: ブルージーな7を、いたずらっぽい遊びとして聞く。
Stage 9: dim / aug / m7-5を、こわい音ではなく不思議な色として聞く。
Stage 10: 全コードを丸暗記せず、必要な鳥を図鑑で探す練習にする。
```

確認結果：

- Stage 3 / 4 / 6 / 7 / 8 / 9 / 10の説明文と進行メモがスマホ幅で表示できる。
- Stage 3以降は「急がず、気になる響きからで大丈夫」と表示され、必須課題に見えにくい。
- Stage 10の「図鑑でさがす」から、全コード図鑑とフィルタへ移動できる。
- スマホ幅で横はみ出しなし。

確認画像：

```text
assets/app/review/more-forest-wording-2026-05-23/mobile-stage3-more-forest-final.png
assets/app/review/more-forest-wording-2026-05-23/mobile-stage9-more-forest-final.png
assets/app/review/more-forest-wording-2026-05-23/mobile-catalog-after-more-forest-final.png
```
