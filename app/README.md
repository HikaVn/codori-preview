# Codori App MVP Prototype

このフォルダは、Codoriウクレレコード記憶アプリの最小Webプロトタイプです。

## 目的

初期4コード、Cメジャー周辺の追加セット、新しいコード種類の入口を、以下の組み合わせで確認できるようにする。

```text
コードネーム
Codori鳥
ウクレレ運指画像
仮コード音
短い学習メモ
```

## 対象コード

初期セット：

```text
C
Cm
C7
Cadd9
```

Expansion Set 01：

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

m7入門：

```text
Am7
Dm7
Em7
```

全コード：

```text
12音 x 主要11コード種類 = 132コード
Major / minor / 7 / add9 / m7 / maj7 / mM7 / sus4 / m7-5 / dim / aug
```

学習上は、初期セットの `C` を中心に、
`C / Dm / Em / F / G / Am` をCメジャー周辺のダイアトニック入門として扱う。
`A7 / D7 / G7` は、7アクションが次へ案内するコードとして扱う。

```text
A7 -> Dm
D7 -> G
G7 -> C
```

D7の主表示は、初心者が押さえやすい `2020`。
`2223` は将来の比較候補としてデータに残す。

m7入門では、m7ファミリー共通のグラサン白い鳥を使う。
目的は、minorより少しクールにほどける夜の余韻をアプリ上で確認すること。

全コードでは、12音と主要11種類を一気に混ぜた生成カタログを表示する。
目的は量産前の全体確認であり、運指は正式教材化前に人間が確認する。
新アクション画像が未作成のコードも、元の白い鳥で表示する。
全コード画面では、コード名検索、音名フィルタ、コード種類フィルタで絞り込める。

トレーニング方針として、`全コード`は図鑑・参照用に扱う。
初心者向けの練習は、3〜6コード程度の小さなセットを別に用意する。
練習ステージの詳細は `docs/ja/learning/training-stage-roadmap.md` を参照する。
練習モードMVPのUI仕様は `docs/ja/learning/practice-mode-mvp-spec.md` を参照する。

練習モードMVPでは、以下を最初の実装対象にする。

```text
Stage 0: Cでコード種類をさらう
Stage 1: Cのまわりの仲間を聞く
Stage 2: 7アクションの行き先を聞く
Stage 5: 曲の景色として進行を聞く
```

## 画面

- カード
- 聞き比べ
- クイズ
- 進行練習

練習モードでは、画面上に現在の歩き方を短く表示する。

```text
音カード = 1つずつ見る
ききくらべ = 違いを聞く
音あて = 思い出す
進行練習 = 流れで聞く
```

Stage 0では、まず1音ずつ聞くことを優先するため、進行練習は無効にする。
Stage 1 / Stage 2 / Stage 5では、コード進行の流れを確認できる。

Stage 1以降の言葉は、初心者が順番に進みたくなるように以下へ寄せる。

```text
Stage 1 = Cへ帰れる仲間を増やす
Stage 2 = 7アクションのそわっとした合図と行き先を覚える
Stage 5 = コード名の丸暗記ではなく、曲の景色として聞く
```

Stage番号は、`0〜10` の学習地図として扱う。
`0 / 1 / 2 / 5` を先にすすめるのは、早く「入口 -> 仲間 -> 7アクション -> 進行」を体験するため。
現在はStage 0〜10をアプリ上で選べる。

```text
Stage 3 = Cメジャーのジャズ寄りダイアトニック
Stage 4 = キーを変えてみる
Stage 6 = sus4とadd9の色づけ
Stage 7 = minorキーの入口
Stage 8 = ブルージーな7の森
Stage 9 = dim / aug / m7-5 の不思議な森
Stage 10 = 全コード図鑑を使う
```

Stage 3以降の「もっと歩く森」は、上級テストではなく寄り道として扱う。
理論名は残しつつ、画面文言では灯り、余韻、ゆれ、寄り道、きらめきなどの景色で伝える。
図鑑モードは必要なコードを探す場所、練習モードは音ときもちを聞いて覚える場所として分ける。
練習中の「図鑑でさがす」は、全コード図鑑へ戻る入口として扱う。

Stage一覧では、初心者向けの推奨順を先に表示する。

```text
おすすめの道 = Stage 0 / Stage 1 / Stage 2 / Stage 5
もっと歩く森 = Stage 3 / Stage 4 / Stage 6 / Stage 7 / Stage 8 / Stage 9 / Stage 10
```

「もっと歩く森」はロック解除風の見せ方にするが、実際には選択可能にする。
目的は制限ではなく、初心者が最初の道に迷わないこと。

羽あとがそろったStageでは「次の森へ」案内を表示する。

```text
おすすめの道: Stage 0 -> Stage 1 -> Stage 2 -> Stage 5
Stage 5完了後: もっと歩く森のStage 3へ
もっと歩く森: Stage番号順に次へ
```

各Stageは、Stage内のコードをすべて聞き、音あてを `コード数 x 3` 回終えると完了。
音カードを全コード分聞いたら、自動で音あてへ移る。
音あてが完了したら、次のStageへ進むボタンを表示する。
進行練習は、流れを聞くための追加確認として残す。

スマホ幅ではStageボタンと練習タブを2列にして、練習本体へ進みやすくする。
進行練習の連続再生中に次Stageへ移動しても、前Stageの再生音は次Stageの羽あとに混ぜない。

## 練習進捗

練習モードでは、ブラウザの`localStorage`に最小進捗を保存する。

保存するもの：

```text
聞いた
音あてした
聞いたコードID
音あて回答数
進行を聞いた
最後に開いていたStage / タブ / カード位置
最後に選んだ進行
```

保存キー：

```text
codori.practiceProgress.v1
```

これはMVP用のローカル保存であり、ユーザーアカウントやクラウド同期ではない。
正解率を競うためではなく、次に開いたとき同じ森へ戻れる「羽あと」として扱う。

選択中Stageには「つづきから」を表示し、最後に見ていたタブやカードへ戻りやすくする。
羽あとを消す操作はStage単位で行い、確認ダイアログで誤操作を防ぐ。

## 初回導線

Stage 0は、初回ユーザーが1分で試せる入口として扱う。

最初の流れ：

```text
1. 音カードで「音をきく」
2. 「つぎへ」で4羽を順番に見る
3. 音あてで、音・コード名・鳥・運指をつなげる
```

カード画面の再生ボタンには「音をきく」を表示し、最初に押す場所を明確にする。
画面上部の歩き方メモは、練習モードと図鑑モードで役割が違うことを伝える。

## セット切り替え

画面上部で以下を切り替える。

```text
はじめの4羽
Cのまわり
m7の夜
全コード
```

初期表示は `はじめの4羽`。
`Cのまわり` を選んだときだけ、Expansion Set 01を表示する。
`m7の夜` を選んだときだけ、m7入門セットを表示する。
`全コード` を選んだときだけ、132コードの生成カタログを表示する。
初期4コードのデータは上書きしない。

## クイズ

クイズは、鳥だけを当てる画面にしない。

鳥と再生ボタンを同時に表示し、
音を一度聞いてからコード名を選ぶ。

回答後に、正解コード名・短いメモ・運指画像を表示する。
回答後の聞き直しはできるが、同じ問題を再回答することはできない。

## アセット参照

```text
assets/app/data/initial-four-chords.json
assets/app/data/expansion-set-01.json
assets/app/data/m7-set-01.json
assets/app/data/all-main-chords.json
assets/app/data/practice-stages.json
assets/approved/characters/
assets/app/characters/provisional/
assets/app/characters/formal-candidate-001/
assets/app/fingering/initial-four/
assets/app/fingering/expansion-set-01/
assets/app/fingering/m7-set-01/
assets/app/fingering/all-main-chords/
assets/logo/codori-logo-app-header-rough-04.svg
```

通常は `initial-four-chords.json` を読み込む。
読み込めない場合は、`app/main.js` 内の最小バックアップデータで動作する。

正式4鳥候補001は正式採用済みで、通常表示でも `assets/approved/characters/` から読み込まれる。
比較確認用として、以下のURLも残す。

```text
http://localhost:8000/app/?formal=1
```

通常表示は `assets/approved/characters/`、`?formal=1` は `assets/app/characters/formal-candidate-001/` を使う。
現在はどちらも正式4鳥候補001ベース。

## 白い鳥アクション候補の確認

2026-05-27時点では、コード種類を鳥種ではなく白い鳥のアクション違いで表す方針に変更した。
2026-05-28時点では、旧アプリ初期版C鳥を正として作り直したv6b候補を表示する。
2026-05-29時点では、コード種類ごとの差を強めたv7候補を表示する。
同日、ポーズだけでは差が伝わりにくいため、v8確認としてコード種類ごとの小さなワンポイントを鳥画像に重ねて表示する。

URLに`actions=1`を付けると、正式採用前の白い鳥アクション候補をコード種類ごとに表示する。

```text
http://localhost:8000/app/?actions=1
http://localhost:8000/app/?actions=1&set=all-main-chords
```

候補画像は以下に置く。

```text
assets/app/characters/action-candidate-old-c-v7/
```

この候補画像は背景付きのレビュー用であり、`assets/approved/characters/` はまだ上書きしない。

当初はワンポイントを鳥PNGへ焼き込まずアプリ側で重ねたが、後乗せでは世界観に馴染まないため本番候補から外す。
2026-05-30時点では、IMAGEGENで白い鳥の表情差を強めた統合版 `assets/app/characters/action-candidate-integrated-v3/` を使う。
形と鳥の関係はコード種類で固定し、キー違いはカード枠、チップ、背景色で表す。

アプリヘッダーは、現フェーズで決定したCodoriロゴ `rough-04` を基準にしたロゴを表示する。

## 音あて補助音

音あては絶対音感テストにしない。
ただし、答えの根音を常に鳴らすと、根音が混ざるStageではそれだけで回答できてしまう。

そのため、補助音は以下のように切り替える。

```text
選択肢の根音が同じ場合: 土台をきく
選択肢の根音が混ざる場合: 基準をきく
```

`土台をきく`は、同じ根音のコード種類を聞き分けるために、答えと同じ根音を鳴らす。
例：`C / Cm / C7 / Cadd9`

`基準をきく`は、答えの根音ではなく、Stageの中心音を鳴らす。

補助音は聞き取りやすさを優先し、基音に対して約20%の第2倍音を加える。
例：CのまわりのStageではC、minorキーの入口ではAを鳴らす。

Stageごとの基準音は`assets/app/data/practice-stages.json`の`quiz_reference_root`で指定する。

```text
assets/logo/codori-logo-app-header-rough-04.svg
```

このロゴは現フェーズ決定ロゴであり、商標調査前の反映とする。

画面確認用に、以下のクエリで初期表示タブを指定できる。

```text
http://localhost:8000/app/?view=card
http://localhost:8000/app/?view=compare
http://localhost:8000/app/?view=quiz
http://localhost:8000/app/?view=progression
```

練習ステージを直接開く場合：

```text
http://localhost:8000/app/?stage=0
http://localhost:8000/app/?stage=1
http://localhost:8000/app/?stage=2
http://localhost:8000/app/?stage=5
http://localhost:8000/app/?stage=5&view=progression
```

図鑑セットを直接開く場合は、`set` を指定する。
`set`指定時は練習ステージではなく図鑑セット表示から始まる。

Expansion Set 01を直接開く場合：

```text
http://localhost:8000/app/?set=expansion-set-01
http://localhost:8000/app/?set=expansion-set-01&view=compare
http://localhost:8000/app/?set=expansion-set-01&view=quiz
```

m7入門を直接開く場合：

```text
http://localhost:8000/app/?set=m7-set-01
http://localhost:8000/app/?set=m7-set-01&view=compare
http://localhost:8000/app/?set=m7-set-01&view=quiz
```

全コードを直接開く場合：

```text
http://localhost:8000/app/?set=all-main-chords
http://localhost:8000/app/?set=all-main-chords&view=compare
http://localhost:8000/app/?set=all-main-chords&view=quiz
http://localhost:8000/app/?actions=1&set=all-main-chords&family=mM7
http://localhost:8000/app/?actions=1&set=all-main-chords&search=CmM7
```

全コードの音あてでは、132個すべての選択肢を一度に出さず、
正解を含む最大6択にする。

全コードのフィルタは、カード / ききくらべ / 音あてで共通して使う。
コード名検索も同じ絞り込みとして扱う。
URLパラメータの`root`、`family`、`search`でも初期絞り込みできる。

例：

```text
Cadd9検索 = 1コード
m7検索 = 12コード
mM7検索 = 12コード
sus4検索 = 12コード
C + すべて = 11コード
すべて + m7 = 12コード
C + m7 = 1コード
```

## 音源

`sound_file_ready` が `true` で、`sound_file` に対応する音声ファイルが存在する場合は、そのファイルを再生する。
まだ音声ファイルがない場合、または `sound_file_ready` が `false` の場合は、ブラウザ内のWeb Audioで仮音源を鳴らす。

コード感が聞こえるように、余韻は長めに設定する。
仮音源の音程は `temp_audio_notes` を参照する。
仮音源は各構成音の基音に対して約20%の第2倍音を加え、コードの輪郭を聞き取りやすくする。

本番では以下へ差し替える。

```text
assets/sound/source/
assets/sound/export/
```

## 起動

リポジトリルートで以下を実行する。

```sh
python3 -m http.server 8000
```

その後、ブラウザで以下を開く。

```text
http://localhost:8000/app/
```
