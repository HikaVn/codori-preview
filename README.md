# Codori

Codoriは、ウクレレコードを「鳥キャラクター」「コード名」「運指画像」「音」「感情」で結びつけて覚えるための学習アプリ兼キャラクターIPです。

このフォルダは、旧作業フォルダ`/Users/hikaru/Software Development/Codori画像作成`から引き継いだ新規プロジェクトです。旧フォルダは参照用として残し、今後の作業は原則としてこの`Codori`フォルダで行います。

## 最初に読むファイル

作業開始時は、以下を順に確認してください。

```text
AGENTS.md
CODEX_GOAL.md
docs/ja/README.md
docs/ja/workflow/current-work-order.md
docs/ja/workflow/project-handoff-2026-05-27.md
```

## 現在の主軸

- ウクレレコード記憶アプリ
- Codori鳥キャラクターの整理
- アプリ素材からのLINEスタンプ、SNS、学習カード、グッズ展開

日本語仕様の正本は`docs/ja/`です。旧英語版や過去メモと食い違う場合は、`docs/ja/`を優先します。

## アプリ確認方法

最小Webプロトタイプは`app/`にあります。

ローカルで確認するだけなら、ブラウザで以下を開きます。

```text
/Users/hikaru/Software Development/Codori/app/index.html
```

簡易サーバーで確認する場合は、プロジェクト直下で以下を実行します。

```bash
python3 -m http.server 8000
```

その後、ブラウザで以下を開きます。

```text
http://localhost:8000/app/
```

## オンライン確認

GitHub Pagesで公開できるように、静的サイト用の入口とワークフローを用意しています。

```text
index.html
.github/workflows/pages.yml
ONLINE_PREVIEW.md
docs/ja/workflow/online-preview-instructions.md
```

オンライン側のCodexやGitHub作業環境に指示する場合は、まず`ONLINE_PREVIEW.md`を渡してください。

## 注意

- 大量生成や12キー展開は、明示指示があるまで行わないでください。
- 新キャラ追加は、学習上の意味とシルエット差を確認してから行ってください。
- 鳥本体は音名やキーで変えません。
- 鳥画像とウクレレ運指画像は別素材として扱います。
- LINEスタンプの文字はコードネームのみです。
