# Codoriオンライン確認・作業指示

このファイルは、Codoriをオンラインから見られるようにするための手順と、オンライン側のCodexに渡す作業指示です。

## 結論

Codoriは静的Webアプリなので、GitHub Pagesで公開できます。

現在の公開用リポジトリ：

```text
https://github.com/HikaVn/codori-preview
```

公開後の入口は以下です。

```text
https://hikavn.github.io/codori-preview/
```

アプリ本体は以下です。

```text
https://hikavn.github.io/codori-preview/app/
https://hikavn.github.io/codori-preview/app/?stage=0&view=quiz
```

## 事前に必要なこと

- GitHubにCodori用リポジトリを作る。
- ローカルの`/Users/hikaru/Software Development/Codori`をそのリポジトリへpushする。
- GitHubの`Settings` -> `Pages`で、Sourceを`GitHub Actions`にする。
- `main`ブランチへpushするか、Actionsから`Deploy Codori to GitHub Pages`を手動実行する。

## 公開対象

GitHub Pagesには、公開用ディレクトリ`_site`を作ってからアップロードします。

実運用では、フルプロジェクトをそのままpublicリポジトリへ置かず、公開確認に必要な最小素材だけを`HikaVn/codori-preview`へpushします。
理由は、Pagesから除外した旧候補やレビュー素材が、publicリポジトリ上で見えてしまうのを避けるためです。

主な入口：

```text
index.html
app/index.html
app/main.js
app/styles.css
assets/
```

`index.html`は`app/`へ誘導する入口です。

公開対象から除外するもの：

```text
.git/
.github/
_site/
assets/app/characters/action-candidate-2026-05-27/
```

`assets/app/characters/action-candidate-2026-05-27/`は旧候補画像を含むため、オンライン公開対象から除外します。

2026-05-29時点の確認：

```text
https://hikavn.github.io/codori-preview/ -> 200
https://hikavn.github.io/codori-preview/app/ -> 200
https://hikavn.github.io/codori-preview/app/?stage=0&view=quiz -> 200
https://hikavn.github.io/codori-preview/assets/app/characters/action-candidate-old-c-v6b/action-major.png -> 200
https://hikavn.github.io/codori-preview/assets/app/characters/action-candidate-2026-05-27/action-major.png -> 404
```

## オンラインCodexへの指示文

以下をオンライン側のCodexやGitHub作業環境に貼ってください。

```text
CodoriプロジェクトをGitHub Pagesで公開できる状態にしてください。

前提：
- Codoriは静的Webアプリです。
- アプリ本体はapp/index.htmlです。
- assets/をapp/から相対参照しています。
- ビルド処理は不要です。
- 既存仕様を壊さないでください。

作業範囲：
1. AGENTS.md、CODEX_GOAL.md、docs/ja/README.mdを読む。
2. .github/workflows/pages.ymlが存在することを確認する。
3. Pagesワークフローが_siteを作成し、assets/app/characters/action-candidate-2026-05-27/を公開対象から除外していることを確認する。
4. GitHub PagesのSourceがGitHub Actionsになっているか確認する。
5. mainブランチへのpush、またはworkflow_dispatchでPagesデプロイを実行する。
6. 公開URLのルートと/app/の両方を開いて確認する。
7. app/?stage=0&view=quizを開き、音あて画面が表示されるか確認する。

禁止事項：
- キャラクター方針を変更しない。
- 画像や音声素材を削除しない。
- 12キー全展開やLINEスタンプ作成へ勝手に進まない。
- 外部サービスの課金設定を勝手に変更しない。

完了条件：
- GitHub Pagesの公開URLが得られている。
- ルートURLからCodoriアプリへ入れる。
- /app/で画面崩れなく表示される。
- /app/?stage=0&view=quizで音あて画面が表示される。
- 旧候補フォルダ assets/app/characters/action-candidate-2026-05-27/ が公開成果物に含まれていない。
- 確認結果と公開URLを報告する。
```

## ローカル確認

公開前にローカルで確認する場合は、プロジェクト直下で以下を実行します。

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

確認URL：

```text
http://127.0.0.1:8766/
http://127.0.0.1:8766/app/
http://127.0.0.1:8766/app/?stage=0&view=quiz
```

## 注意

GitHub Pagesの公開URLは、初回デプロイ後にActionsのログまたはPages設定画面で確認します。

推論ですが、現状のCodoriはサーバー処理を使っていないため、GitHub Pagesで十分です。ユーザー管理、クラウド保存、独自ドメイン、音源配信制御が必要になった段階で、Cloudflare Pages、Netlify、Vercelなども比較対象にします。
