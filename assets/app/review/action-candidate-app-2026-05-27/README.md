# 白い鳥アクション候補 アプリ表示確認 2026-05-27

## このフォルダについて

`?actions=1`で白い鳥アクション候補をアプリに表示する確認用フォルダです。

## 確認URL

```text
http://localhost:8765/app/?actions=1&set=all-main-chords
```

## 画像

```text
actions-all-main-chords.png
actions-card.png
```

## 確認結果

- ローカルHTTP取得は200。
- アクション候補画像のHTTP取得は200。
- Headless Chromeでスクリーンショットを書き出し済み。

注意：

- Browser MCPは接続エラーになったため、Chrome headlessで代替確認した。
- `actions-card.png`はアンカー移動の影響で上部余白が大きい。表示ロジック確認用として扱う。
