# Codori アプリMVPプロトタイプ計画

## このファイルについて

このファイルは、Codoriウクレレコード記憶アプリの最初のWebプロトタイプ方針をまとめる。

目的は、承認済みの初期4鳥・コードネーム・運指画像を使って、
学習アプリとして成立する最小体験を確認すること。

---

# MVPで確認すること

初期MVPでは、ユーザーが以下を自然に結びつけられるか確認する。

```text
コード名
鳥キャラクター
ウクレレ運指画像
短いコード音
コード印象
```

---

# 対象コード

```text
C
Cm
C7
Cadd9
```

この4つは、2026-05-21時点で初期MVP用として承認済み。

---

# 実装済みプロトタイプ

```text
app/index.html
app/styles.css
app/main.js
app/README.md
```

## 画面

| 画面 | 目的 |
|---|---|
| カード | 1つのコードを鳥・運指・音・印象で覚える |
| 聞き比べ | 4コードの違いを並べて確認する |
| クイズ | 鳥と音を同時に確認し、コード名を選ぶ。回答後に運指画像も見る |

## 正式4鳥ベースの調整

2026-05-22時点で、正式4鳥を `assets/approved/characters/` に反映済み。

アプリMVPでは通常表示で正式4鳥を使う。

クイズでは、選択肢を最初から押せないようにし、
再生ボタンで音を聞いたあとに回答できるようにする。
回答後の聞き直しはできるが、同じ問題の再回答はできない。
「次の問題」は回答後だけ押せるようにする。

目的：

- 鳥だけを当てるクイズにしない
- 音を聞く行動を必ず入れる
- 鳥、音、コード名、運指画像を結びつける

---

# アセット参照

## 鳥キャラクター

```text
assets/approved/characters/major.png
assets/approved/characters/minor.png
assets/approved/characters/seventh.png
assets/approved/characters/add9.png
```

## 運指画像

```text
assets/app/fingering/initial-four/ukulele_C_vertical_strings.svg
assets/app/fingering/initial-four/ukulele_Cm_vertical_strings.svg
assets/app/fingering/initial-four/ukulele_C7_vertical_strings.svg
assets/app/fingering/initial-four/ukulele_Cadd9_vertical_strings.svg
```

## データ

```text
assets/app/data/initial-four-chords.json
```

現在のプロトタイプでは、`assets/app/data/initial-four-chords.json` を読み込む。
読み込めない場合のみ、`app/main.js` 内のバックアップデータで動作する。

理由：

- 承認済みコードデータをアプリ表示の基準にする
- 後でコード追加するとき、JSONを拡張しやすくする
- ローカルサーバー外で開いた場合でも最低限動くようにする

---

# 音源方針

MVPでは、`sound_file_ready` が `true` で、`sound_file` に対応する音声ファイルが存在する場合は音声ファイルを再生する。
まだ音声ファイルがない場合、または `sound_file_ready` が `false` の場合は、ブラウザ内のWeb Audioで仮音源を鳴らす。

本番前に差し替える候補：

- 実録音のウクレレ音
- 生成音源
- アプリ用短尺音源
- LINEサウンド付きスタンプ用に調整した音源

初期ルール：

- 和音が聞こえる程度に余韻を長めにする
- 短く鳴らして終わる効果音ではなく、コード感を確認できる長さにする
- 仮音源の音程は `temp_audio_notes` で管理する
- 表示コードと鳴る音を一致させる
- 音量は控えめ
- 音源ファイル未作成でも学習フローを試せるようにする

---

# MVPでやらないこと

- 12キー展開
- 全コード図鑑
- ログイン
- 練習履歴
- 採点
- マイク判定
- LINEスタンプ本番申請
- サウンド付きスタンプ音声仕様の最終確認

---

# 次に確認すること

1. 通常アプリ画面で正式4鳥が正しく表示されるか。
2. スマホ幅で鳥・コードネーム・運指画像が見やすいか。
3. カード画面の情報量が多すぎないか。
4. 聞き比べ画面で4鳥の違いが伝わるか。
5. クイズで音を聞いてからコード名を選べるか。
6. 回答後に運指画像まで自然につながるか。
7. 仮音源でもコード差が感じられるか。

---

# 未決事項

- MVPはこのままWebアプリとして進めるか。
- 仮音源をWeb Audioのまま続けるか、音声ファイルを先に作るか。
- 正式4鳥の表情差分をMVP内でいつ追加するか。
