# Codori アプリMVP正式4鳥確認メモ

## このファイルについて

このファイルは、
正式4鳥を反映したCodoriウクレレコード記憶アプリMVPの確認結果を記録するメモです。

対象：

```text
app/index.html
app/styles.css
app/main.js
assets/app/data/initial-four-chords.json
assets/approved/characters/
```

---

# 前提

- 正式4鳥は採用済み
- `assets/approved/characters/` に反映済み
- 初期4コードは `C / Cm / C7 / Cadd9`
- 運指画像は弦を上下方向に表示
- 音源制作は後回し
- Web Audio仮音源を使う

---

# 確認した画面

## カード

目的：

- 1つのコードを、鳥・コード名・運指画像・音・印象で覚える

確認内容：

- 正式4鳥を `assets/approved/characters/` から読み込む
- コードネームを大きく表示する
- 鳥画像と運指画像を別枠で表示する
- 再生ボタンでWeb Audio仮音源を鳴らす

調整：

- 鳥画像と運指画像に最大高さを設定
- スマホ幅で縦に並んでも画面が長くなりすぎないように調整

---

## 聞き比べ

目的：

- 初期4コードの違いを並べて確認する

確認内容：

- 4鳥を同じグリッドで表示する
- 各コードに再生ボタンを付ける
- 鳥画像と運指画像を同じカード内に置く

調整：

- 鳥画像と運指画像に個別クラスを付ける
- 鳥と運指の余白を調整しやすくした

---

## クイズ

目的：

- 鳥だけを当てるのではなく、鳥・音・コード名・運指画像を結びつける

確認内容：

- 鳥と再生ボタンを同時に表示する
- 音を聞いてからコード名を選ぶ
- 回答後に正解コード名、学習メモ、運指画像を表示する

調整：

- 選択肢は初期状態では押せない
- 再生ボタンを押すと選択肢が有効になる
- 回答後の聞き直しでは、同じ問題を再回答できない
- 「次の問題」は回答後だけ押せる
- 結果文言を「音を聞いて選ぶ」流れに変更

---

# スマホ幅

スマホ幅では以下を基本にする。

```text
コードネーム
鳥
運指画像
学習メモ
操作ボタン
```

調整内容：

- カード画面は1カラムにする
- 鳥と運指画像を上下配置にする
- クイズも1カラムにする
- 鳥画像が大きくなりすぎないように最大高さを設定する
- 選択肢は1列にする

---

# 実装変更

```text
app/index.html
app/main.js
app/styles.css
app/README.md
```

主な変更：

- クイズ回答を音再生後に有効化
- 回答後の再生では選択肢を再有効化しない
- クイズ結果文言を学習目的に寄せる
- 学習メモを、理論説明より感情で覚えやすい表現へ調整
- アプリ内メッセージを、Codori世界観に合うやわらかい表現へ調整
- アプリ内フォントを丸ゴシック系のCodori用スタックへ変更
- 聞き比べの鳥画像・運指画像に個別クラスを追加
- スマホ幅の画像サイズと余白を調整
- Codoriロゴ rough-04 を基準にしたアプリヘッダーロゴを追加
- ヘッダーでロゴと日本語タイトルを分けて表示

---

# ロゴヘッダー仮反映

対象：

```text
assets/logo/codori-logo-app-header-rough-04.svg
assets/logo/codori-icon-rough-04.svg
```

判断：

- rough-04を現フェーズ決定ロゴとして扱う
- アプリヘッダーでは英字サブコピーを入れない
- `Codori`ロゴと日本語タイトル「ウクレレコード記憶」を分ける
- アイコン単体は48pxでも顔と白鳥感が読める
- 現時点では頭ハネの追加微調整は不要

確認画像：

```text
assets/logo/review/app-header-rough-04-desktop.png
assets/logo/review/app-header-rough-04-mobile.png
assets/logo/review/codori-icon-rough-04-small-check.png
assets/logo/review/app-header-rough-04-adoption-desktop.png
assets/logo/review/app-header-rough-04-adoption-mobile.png
assets/logo/review/codori-icon-rough-04-adoption-small-check.png
```

注意：

- 正式ロゴ採用ではなく、アプリヘッダー仮反映
- 商標調査は未実施
- 既存4鳥の再デザインはしていない

---

# 確認済み

- `node --check app/main.js` OK
- `assets/app/data/initial-four-chords.json` JSON構文OK
- `assets/app/data/initial-four-chords.formal-candidate-001.json` JSON構文OK
- `http://localhost:8000/app/` 200 OK
- 正式4鳥画像は `assets/approved/characters/` から通常表示で参照される
- Playwright Chromiumでカード画面のPC幅・スマホ幅スクリーンショットを確認
- Playwright Chromiumでカード / 聞き比べ / クイズのPC幅・スマホ幅スクリーンショットを確認
- クイズは再生前に選択肢が無効、再生後に有効、回答後に再び無効になることを確認
- 回答後は正解コード名、鳥、運指画像、学習メモが表示されることを確認
- スマホ幅で横スクロールが出ないことを確認
- 未作成音源への404を避けるため、`sound_file_ready: false` の間はWeb Audio仮音源を直接使う
- 学習体験レビューを `docs/ja/learning/app-mvp-learning-experience-review.md` に記録
- 正式4鳥の画像サイズ確認済み
- Codoriロゴ rough-04 のアプリヘッダー仮反映をPC幅・スマホ幅で確認
- アイコン単体の128px / 96px / 64px / 48px縮小確認済み
- Codoriロゴ rough-04 を現フェーズ決定として固定
- アプリ内メッセージを `world-tone-guide.md` に合わせてやわらかく調整
- アプリ内フォントを `visual-style-guide.md` の丸ゴシック系スタックに合わせた
- PC幅・スマホ幅で丸ゴシック系フォント反映後の表示を確認

正式4鳥画像サイズ：

```text
major.png   531 x 560
minor.png   483 x 559
seventh.png 545 x 553
add9.png    527 x 525
```

---

# まだやらないこと

- 新キャラ追加
- 12キー展開
- 音源制作
- LINE本番申請
- 16個以上のスタンプ量産
- 正式4鳥の再デザイン

---

# 次に確認すること

- 実機スマホでタップしやすいか
- Web Audio仮音源の音量が大きすぎないか
- クイズで連続回答したとき、学習の流れが自然か
- 正解/不正解用の表情差分を作るか

---

# 確認用スクリーンショット

```text
assets/app/review/mvp-current-2026-05-22/desktop-card.png
assets/app/review/mvp-current-2026-05-22/desktop-compare.png
assets/app/review/mvp-current-2026-05-22/desktop-quiz.png
assets/app/review/mvp-current-2026-05-22/mobile-card.png
assets/app/review/mvp-current-2026-05-22/mobile-compare.png
assets/app/review/mvp-current-2026-05-22/mobile-quiz.png
assets/app/review/mvp-current-2026-05-22/mobile-quiz-after-answer.png
assets/logo/review/app-header-rough-04-desktop.png
assets/logo/review/app-header-rough-04-mobile.png
assets/logo/review/codori-icon-rough-04-small-check.png
assets/logo/review/app-header-rough-04-adoption-desktop.png
assets/logo/review/app-header-rough-04-adoption-mobile.png
assets/logo/review/codori-icon-rough-04-adoption-small-check.png
assets/app/review/mvp-current-2026-05-22/mobile-rounded-font-card.png
assets/app/review/mvp-current-2026-05-22/mobile-rounded-font-quiz.png
assets/app/review/mvp-current-2026-05-22/desktop-rounded-font-card.png
```
