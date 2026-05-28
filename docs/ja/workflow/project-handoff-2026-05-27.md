# Codori 新規プロジェクト引き継ぎメモ

## 結論

`/Users/hikaru/Software Development/Codori画像作成`で進めていた内容を、新規作業フォルダ`/Users/hikaru/Software Development/Codori`へ引き継ぎました。

以後の作業は、原則として新規フォルダ`Codori`を開いて進めます。

## 引き継ぎ元

```text
/Users/hikaru/Software Development/Codori画像作成
```

旧フォルダは参照用として残します。

## 引き継ぎ先

```text
/Users/hikaru/Software Development/Codori
```

## コピー方針

引き継ぎ対象：

- `AGENTS.md`
- `CODEX_GOAL.md`
- `FIRST_MESSAGE.md`
- `app/`
- `assets/`
- `docs/`
- `prompts/`
- `tools/`

除外対象：

- `.DS_Store`
- `test-results/`

除外理由は、macOSの表示用メタデータと一時的なテスト結果であり、プロジェクト正本ではないためです。

## 現在の状態

- Git管理は引き継ぎ元にはありませんでした。
- アプリMVPは`app/`に静的Webプロトタイプとして存在します。
- 日本語正本は`docs/ja/`です。
- 初期4鳥、Expansion Set 01、A7/D7、m7仮実装、全主要コードカタログ、練習モードMVPの最小UIまで実装済みです。

## 作業開始時に読むもの

```text
AGENTS.md
CODEX_GOAL.md
docs/ja/README.md
docs/ja/workflow/current-work-order.md
```

## 次のおすすめ作業

1. 新規フォルダ`/Users/hikaru/Software Development/Codori`をVSCodeまたはCodexで開く。
2. `app/index.html`をブラウザで確認する。
3. `docs/ja/workflow/current-work-order.md`の未完了項目を確認する。
4. 必要であれば、Git初期化と初回コミットを行う。

## 注意点

- 旧フォルダと新フォルダを並行編集すると差分が分散するため、今後は新フォルダを正とします。
- 大量生成、全コード展開、新キャラ追加は、作業指示があるまで進めません。
- 仕様判断を変える場合は、必ず`docs/ja/`へ理由を残します。
