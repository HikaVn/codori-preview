# Codori /goal移行準備パック

## このファイルについて

このファイルは、Codoriを `/goal` で次フェーズへ進める前に、目的・前提・禁止事項・承認済み項目を揃えるための移行パックです。

現在のCodoriは、LINEスタンプ単体企画ではなく、

```text
メイン = ウクレレコード記憶アプリ
派生 = LINEサウンド付きスタンプ / SNS / 教材 / グッズ
```

として扱う。

---

# 現在位置

現在は、以下が進んでいる。

- 初期4鳥の候補選定
- Majorの頭上ハネ2本方針
- コードネーム表示方針
- Deep Blue文字スタイル試作
- LINEサイズ確認
- ウクレレ運指画像の縦弦ルール
- 初期4コードの仮データ
- アプリMVP画面の最小仕様
- `assets/approved/` の受け皿作成

次の `/goal` をアプリMVP設計に限定するなら、実行可能な段階。

理由：

- 初期4鳥は準正式採用済み
- Deep Blue文字スタイルは仮本命承認済み
- approvedフォルダに正式参照名を整理済み
- `Cadd9` の運指 `0203` は初期MVP用に採用済み
- 音源はMVPでは仮音源から始める
- 次フェーズはアプリMVP設計を主目的にする

---

# /goalの推奨目的

次に `/goal` を使う場合、主目的は以下にする。

```text
Codoriウクレレコード記憶アプリMVP設計
```

この `/goal` で作るもの：

- 初期4コード学習カード仕様
- アプリ画面構成
- コードデータ参照ルール
- 鳥画像と運指画像の表示ルール
- 音再生導線
- LINEスタンプ派生書き出し方針

この `/goal` でやらないこと：

- 12キー全展開
- 全コード図鑑化
- 32個以上のスタンプ量産
- 大量カラーバリエーション
- サウンド付きLINEスタンプ本番申請
- グッズ展開

---

# /goal前に承認済みの項目

2026-05-21時点で承認済み：

1. 初期4鳥を準正式採用する
2. Deep Blue文字スタイルを仮本命として進める
3. 初期4コードを `C / Cm / C7 / Cadd9` で固定する
4. `Cadd9` の運指を `0203` で進める
5. 音源はMVPでは仮音源から始める
6. 次の `/goal` はアプリMVP設計にする

---

# /goal前に整理するアセット

`assets/approved/` に以下を置く。

```text
assets/approved/characters/
assets/approved/stickers/
assets/approved/app/
assets/approved/style/
```

整理対象：

- 初期4鳥の準採用候補画像
- Deep Blue文字スタイル基準画像
- LINE 370×320px確認画像
- アプリで使う運指画像参照
- 初期4コードJSON

注意：

- approvedに入れる画像は「本命」または「準正式採用」に限定する。
- 比較用・失敗案・ラフは `assets/rough/` に残す。
- approvedに入れた理由はREADMEまたは該当ドキュメントに書く。

---

# /goal時の入力ファイル

新しい作業セッションでは、最低限以下を読む。

```text
AGENTS.md
CODEX_GOAL.md
FIRST_MESSAGE.md
docs/ja/README.md
docs/ja/learning/ukulele-chord-memory-system.md
docs/ja/learning/ukulele-fingering-display-guide.md
docs/ja/learning/initial-four-chord-data.md
docs/ja/learning/app-mvp-screen-spec.md
docs/ja/workflow/goal-readiness-task-list.md
assets/app/data/initial-four-chords.json
assets/approved/README.md
```

---

# 実行時の優先順位

1. アプリ学習体験
2. 初期4コードのわかりやすさ
3. 鳥キャラクターのかわいさ
4. コードネームの視認性
5. LINEスタンプへの転用しやすさ
6. 将来の12キー・コード図鑑展開

LINEスタンプは重要だが、アプリ素材から派生させる。

---

# /goal開始時に使う指示案

```text
Codoriの次フェーズを進めてください。

docs/jaを日本語正本とし、Codoriの主軸はウクレレコード記憶アプリです。
LINEスタンプはアプリ素材から派生するものとして扱います。

まず以下を読んでください。

- AGENTS.md
- CODEX_GOAL.md
- FIRST_MESSAGE.md
- docs/ja/README.md
- docs/ja/learning/ukulele-chord-memory-system.md
- docs/ja/learning/ukulele-fingering-display-guide.md
- docs/ja/learning/initial-four-chord-data.md
- docs/ja/learning/app-mvp-screen-spec.md
- docs/ja/workflow/goal-readiness-task-list.md
- assets/app/data/initial-four-chords.json
- assets/approved/README.md

やること：

1. 初期4コード C / Cm / C7 / Cadd9 の学習カード仕様を固める
2. 鳥画像・コードネーム・縦弦運指画像・音再生を接続する
3. LINEスタンプ派生書き出しの条件を整理する
4. 大量展開はせず、MVPに必要な範囲だけ進める
5. ユーザー承認が必要な判断は勝手に確定しない

注意：

- コード種類 = 鳥種
- キー = 小さな色・光・タグ
- 展開形 = ポーズ
- テンション = アクセサリ
- 鳥画像と運指画像は別アセット
- スタンプ文字はコードネームのみ
- 日常あいさつ文は入れない
```

---

# 未決事項

- アプリMVPはWebで始めるか。
- 初期4コードの仮音源をどの方法で作るか。
- 透過PNG化とコードネーム後載せ合成を `/goal` 内で扱うか。
