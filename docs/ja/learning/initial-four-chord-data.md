# Codori 初期4コード学習データ

## このファイルについて

このファイルは、Codoriウクレレコード記憶アプリの初期4コードに必要な学習データを整理するためのメモです。

対象：

```text
C
Cm
C7
Cadd9
```

---

# 前提

暫定前提：

- チューニングは標準GCEA
- 弦表示は上下方向
- 弦の並びは左から `G / C / E / A`
- 運指画像はキャラ画像とは別アセット
- LINEスタンプには基本的に運指画像を入れない

---

# 初期4コード一覧

| code_id | 表示名 | root | family | 仮運指 | 運指画像 | 音声ファイル | 学習メモ |
|---|---|---|---|---|---|---|---|
| C_major | C | C | Major | 0003 | ukulele_C_vertical_strings.svg | codori_sound_01_C_ukulele.wav | ほっと帰れる明るさ |
| C_minor | Cm | C | minor | 0333 | ukulele_Cm_vertical_strings.svg | codori_sound_02_Cm_ukulele.wav | 今日は少し静か |
| C_7 | C7 | C | 7 | 0001 | ukulele_C7_vertical_strings.svg | codori_sound_03_C7_ukulele.wav | つぎへ行きたくなる |
| C_add9 | Cadd9 | C | add9 | 0203 | ukulele_Cadd9_vertical_strings.svg | codori_sound_04_Cadd9_ukulele.wav | ふわっと空気が広がる |

---

# 追加MVPフィールド

Webプロトタイプでは、上記に加えて以下を使う。

| フィールド | 用途 |
|---|---|
| memory_hint | カード画面の覚え方メモ |
| temp_audio_notes | Web Audio仮音源の周波数配列 |
| sound_file_ready | 音声ファイルを実再生してよいか |

---

# JSON化する場合の形

```json
[
  {
    "code_id": "C_major",
    "display_name": "C",
    "root": "C",
    "family": "Major",
    "ukulele_fingering": "0003",
    "fingering_asset": "assets/app/fingering/initial-four/ukulele_C_vertical_strings.svg",
    "string_direction": "vertical",
    "sound_file": "assets/sound/source/codori_sound_01_C_ukulele.wav",
    "sound_file_ready": false,
    "character_asset": "assets/approved/characters/major.png",
    "key_accent": "C",
    "learning_note": "ほっと帰れる明るさ"
  },
  {
    "code_id": "C_minor",
    "display_name": "Cm",
    "root": "C",
    "family": "minor",
    "ukulele_fingering": "0333",
    "fingering_asset": "assets/app/fingering/initial-four/ukulele_Cm_vertical_strings.svg",
    "string_direction": "vertical",
    "sound_file": "assets/sound/source/codori_sound_02_Cm_ukulele.wav",
    "sound_file_ready": false,
    "character_asset": "assets/approved/characters/minor.png",
    "key_accent": "C",
    "learning_note": "今日は少し静か"
  },
  {
    "code_id": "C_7",
    "display_name": "C7",
    "root": "C",
    "family": "7",
    "ukulele_fingering": "0001",
    "fingering_asset": "assets/app/fingering/initial-four/ukulele_C7_vertical_strings.svg",
    "string_direction": "vertical",
    "sound_file": "assets/sound/source/codori_sound_03_C7_ukulele.wav",
    "sound_file_ready": false,
    "character_asset": "assets/approved/characters/seventh.png",
    "key_accent": "C",
    "learning_note": "つぎへ行きたくなる"
  },
  {
    "code_id": "C_add9",
    "display_name": "Cadd9",
    "root": "C",
    "family": "add9",
    "ukulele_fingering": "0203",
    "fingering_asset": "assets/app/fingering/initial-four/ukulele_Cadd9_vertical_strings.svg",
    "string_direction": "vertical",
    "sound_file": "assets/sound/source/codori_sound_04_Cadd9_ukulele.wav",
    "sound_file_ready": false,
    "character_asset": "assets/approved/characters/add9.png",
    "key_accent": "C",
    "learning_note": "ふわっと空気が広がる"
  }
]
```

---

# 学習順

## 1. C

最初の基準。

見るもの：

- Major鳥
- `C`
- 運指 `0003`
- ほっと帰れる明るい音

覚えること：

```text
C = ほっと帰ってこられる音
```

---

## 2. Cm

Cとの違いを覚える。

見るもの：

- minor鳥
- `Cm`
- 運指 `0333`
- 今日は少し静かな音

覚えること：

```text
m が付くと少し影が出る
```

---

## 3. C7

動きのあるコードとして覚える。

見るもの：

- 7鳥
- `C7`
- 運指 `0001`
- つぎへ行きたくなる音

覚えること：

```text
7 が付くと動きが出る
```

---

## 4. Cadd9

広がりのあるコードとして覚える。

見るもの：

- add9鳥
- `Cadd9`
- 運指 `0203`
- ふわっと広がる音

覚えること：

```text
add9 は明るさに空気を足す
```

---

# 未決事項

- 指番号データを初期から持つか。
- 音声ファイルをいつ実録音または生成音へ差し替えるか。
