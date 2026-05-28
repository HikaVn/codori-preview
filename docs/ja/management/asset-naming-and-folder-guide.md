# asset-naming-and-folder-guide.md

# Codori アセット命名・フォルダ管理ガイド

## このファイルについて

このファイルは、
Codoriプロジェクトの：

- 画像
- スタンプ
- ラフ
- キャラ差分
- SNS素材
- 将来アプリ素材

を整理するためのガイド。

目的：

- ファイル迷子防止
- 絵柄混在防止
- AI生成管理
- 将来的な量産対応
- Claude / Codex / 人間作業の共有整理

---

# 最重要方針

Codoriは、
今後：

- スタンプ
- SNS
- グッズ
- アプリ
- 図鑑

へ広がる。

そのため：

「後から探せること」

を最優先にする。

---

# 推奨フォルダ構成

```text
assets/
├── references/
├── rough/
├── formal/
├── approved/
├── line-stickers/
├── social/
├── app/
├── exports/
└── archive/
```

---

# references/

## 用途

参考資料。

例：

- 鳥参考
- 色参考
- 絵柄参考
- 世界観参考

---

# rough/

## 用途

AI生成ラフ。

未採用案。

---

# approved/

# formal/

## 用途

正式採用前の候補素材。

現在のCodoriでは、
初期4鳥の作り直し候補をここで管理する。

例：

```text
assets/formal/characters/
assets/formal/lineups/
assets/formal/checks/
```

重要：

ユーザー承認前に `assets/approved/` を上書きしない。
正式候補はまず `assets/formal/` に置く。

---

# approved/

## 用途

採用済みキャラ。

重要：

ここに入ったものを
“承認済みデザイン”
として扱う。

---

# line-stickers/

## 用途

LINEスタンプ制作専用。

---

## 推奨構成

```text
line-stickers/
├── pack01/
├── pack02/
└── exports/
```

---

# social/

## 用途

SNS投稿素材。

例：

- 今日のコード
- 季節投稿
- 練習応援
- add9特集

---

# app/

## 用途

将来アプリ用。

例：

- UI
- アイコン
- アニメーション素材
- バッジ

---

# exports/

## 用途

最終書き出し。

---

## 重要

ここには：

- PNG
- WebP
- ZIP

など、
完成データのみ置く。

---

# archive/

## 用途

古い案保存。

削除より、
archive移動を推奨。

---

# ファイル命名ルール

## 基本

```text
[chord]-[emotion]-[version]
```

---

# 例

```text
major-happy-v01.png
minor-thinking-v02.png
add9-night-v03.png
7-letsgo-v01.png
```

---

# LINEスタンプ命名

## 推奨

```text
sticker-[number]-[emotion]
```

---

# 例

```text
sticker-01-hello.png
sticker-02-thanks.png
sticker-03-ok.png
```

---

# AI生成ラフ命名

## 推奨

```text
rough-[chord]-[date]-[number]
```

---

# 例

```text
rough-major-2026-05-19-01.png
rough-add9-2026-05-19-07.png
```

---

# 採用案命名

## 推奨

```text
approved-[chord]-main-v01
```

---

# 例

```text
approved-major-main-v01.png
approved-minor-main-v02.png
```

---

# バージョン管理

## 重要

上書き保存しすぎない。

---

# 推奨

```text
v01
v02
v03
```

を付ける。

---

# NG

```text
final.png
final2.png
final_really_final.png
```

---

# 色違い管理

## 注意

色違い地獄を避ける。

---

# 推奨

キー違いは：

```text
major-c-key
major-g-key
```

などで整理。

---

# 画像生成時の保存ルール

## 保存推奨

- 生成日時
- 使用モデル
- プロンプト
- seed

を残す。

---

# 推奨方法

```text
prompts/
generated/
metadata/
```

をセット管理。

---

# AI生成時の注意

## 残すべきもの

- 良かった失敗
- 崩れ方
- かわいかった偶然

---

# 理由

Codoriは、
偶然の“かわいさ”が重要。

---

# SNS素材ルール

## 推奨サイズ

- 正方形
- 縦長
- 小サイズでも読める

---

# 注意

背景を凝りすぎない。

キャラ優先。

---

# LINE素材ルール

## 最重要

- 顔大きめ
- 太線
- 透過PNG
- 小サイズ確認

---

# 推奨チェック

制作後：

- スマホ実表示
- LINE一覧
- ダークモード

を確認。

---

# Codoriらしさ維持

整理が崩れると：

- 世界観崩壊
- 絵柄混在
- 別作品感

が起きる。

---

# 将来拡張想定

今後：

- 英語版
- animated版
- 着せ替え
- 図鑑アプリ

などへ拡張可能。

そのため：

「後から整理できる命名」

を維持する。

---

# 未決事項

- 日付形式統一
- 英語命名固定するか
- 日本語ファイル名を許可するか
- キャラ固有名追加時の命名
