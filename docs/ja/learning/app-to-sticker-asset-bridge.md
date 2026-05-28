# Codori アプリ素材からLINEスタンプへの橋渡し

## このファイルについて

このファイルは、Codoriウクレレコード記憶アプリMVPで使う素材を、
LINEスタンプ派生へ転用するための整理メモです。

アプリが主軸で、LINEスタンプは派生展開とする。

---

# 基本方針

アプリ素材は以下の順で作る。

```text
鳥キャラクター画像
↓
背景削除・透明PNG化
↓
アプリ表示 / LINEスタンプ表示へ流用
↓
コードネームを後載せ合成
↓
音声ファイルを対応付ける
```

コードネームを画像生成時に直接入れない。
背景削除後の透明PNGに、別レイヤーでコードネームを載せる。

---

# 初期4コード

```text
C
Cm
C7
Cadd9
```

---

# アプリ側で使う素材

## 鳥キャラクター

```text
assets/approved/characters/major.png
assets/approved/characters/minor.png
assets/approved/characters/seventh.png
assets/approved/characters/add9.png
```

正式4鳥候補001の比較確認用：

```text
assets/app/characters/formal-candidate-001/major.png
assets/app/characters/formal-candidate-001/minor.png
assets/app/characters/formal-candidate-001/seventh.png
assets/app/characters/formal-candidate-001/add9.png
```

## 運指画像

```text
assets/app/fingering/initial-four/
```

## コードデータ

```text
assets/app/data/initial-four-chords.json
assets/app/data/initial-four-chords.formal-candidate-001.json
```

---

# LINEスタンプ側で追加するもの

## 正式候補001

正式4鳥候補001は正式採用済み。
通常のLINE候補も正式候補001ベースで再書き出し済み。

比較確認用の書き出し：

```text
assets/line/formal-candidate-001/source/transparent/
assets/line/formal-candidate-001/export/stickers/
```

正式採用後の通常書き出し：

```text
assets/line/source/transparent/
assets/line/export/stickers/
```

## 透明PNG

生成済み：

```text
assets/line/source/transparent/
```

用途：

- 背景削除済みの鳥キャラクター
- コードネーム後載せ合成の土台
- アプリ側にも再利用可能

## コードネーム後載せ画像

生成済み：

```text
assets/line/export/stickers/
```

初期4個：

```text
codori_line_01_C_major.png
codori_line_02_Cm_minor.png
codori_line_03_C7_seventh.png
codori_line_04_Cadd9_add9.png
```

確認メモ：

```text
docs/ja/stickers/app-mvp-line-derivative-export.md
```

レビュー用一覧：

```text
assets/line/review/app-mvp-derivative/
```

## 音声ファイル

後回し：

```text
assets/sound/source/
assets/sound/export/
```

初期4個：

```text
codori_sound_01_C_ukulele.wav
codori_sound_02_Cm_ukulele.wav
codori_sound_03_C7_ukulele.wav
codori_sound_04_Cadd9_ukulele.wav
```

---

# アプリMVPとの接続

`initial-four-chords.json` の `sound_file` は、将来の音声ファイル名を先に参照している。
ただし、音源制作は後回しなので、現時点では `sound_file_ready: false` とする。

現在のWebプロトタイプでは：

- `sound_file_ready` が `true` で音声ファイルが存在すれば `sound_file` を再生
- `sound_file_ready` が `false` なら `temp_audio_notes` でWeb Audio仮音源を再生

このため、音声ファイルを追加してもアプリ側の構造を大きく変えずに差し替えられる。

---

# まだやらないこと

- 16個以上のスタンプ量産
- 12キー展開
- LINE本番申請
- サウンド付きスタンプ仕様の最終確定
- 新キャラ追加

---

# 次にやる候補

1. 縮小参考画像で最終目視確認する。
2. 必要ならコードネームの位置・サイズを微調整する。
3. 透過エッジの欠けや白残りを確認する。
4. 音声制作フェーズに入ったら、初期4コードの長めの余韻付きウクレレ音源を作る。
5. 音声ファイル追加後、アプリMVPとサウンド付きスタンプ派生の両方で再確認する。
