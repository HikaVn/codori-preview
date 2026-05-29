# Codoriオンライン確認手順

## 目的

Codoriをローカルだけでなく、オンラインからも確認できる状態にする。

## 採用方針

現段階ではGitHub Pagesを第一候補にする。

理由：

- Codoriは静的Webアプリで、ビルド処理が不要。
- `app/`と`assets/`をそのまま公開できる。
- GitHub上の作業、Codexへの指示、公開URLの共有を同じ場所で扱える。
- 無料枠で試しやすい。

2026-05-29時点の公開URL：

```text
https://hikavn.github.io/codori-preview/
https://hikavn.github.io/codori-preview/app/
https://hikavn.github.io/codori-preview/app/?stage=0&view=quiz
```

公開用リポジトリ：

```text
https://github.com/HikaVn/codori-preview
```

フルプロジェクトをそのままpublicリポジトリへ置くと、Pagesから除外した旧候補やレビュー素材もGitHub上では見えてしまう。
そのため、公開用リポジトリにはアプリ表示に必要な最小素材だけを置く。

## 追加した公開準備

- ルート`index.html`を追加し、`app/`へ入れる入口を作った。
- `.github/workflows/pages.yml`を追加し、GitHub Pagesへデプロイできるようにした。
- Pagesデプロイ時に`_site`を作成し、旧候補画像フォルダ`assets/app/characters/action-candidate-2026-05-27/`を公開対象から除外する。
- `.nojekyll`を追加し、静的ファイルをそのまま配信する前提を明示した。
- ルート`ONLINE_PREVIEW.md`に、オンライン側のCodexへ渡す指示文をまとめた。

## 公開確認結果

2026-05-29に以下を確認済み。

```text
ルートURL: 200
/app/: 200
/app/?stage=0&view=quiz: 200
現行v6b素材: 200
旧候補素材 action-candidate-2026-05-27: 404
```

## GitHub側で必要な操作

1. Codori用のGitHubリポジトリを作る。
2. ローカルプロジェクトをpushする。
3. GitHubの`Settings` -> `Pages`を開く。
4. Sourceを`GitHub Actions`にする。
5. `main`へpushするか、Actionsから`Deploy Codori to GitHub Pages`を手動実行する。
6. Actions完了後、公開URLを開く。

## 確認URL

公開後：

```text
https://<GitHubユーザー名>.github.io/<リポジトリ名>/
https://<GitHubユーザー名>.github.io/<リポジトリ名>/app/
https://<GitHubユーザー名>.github.io/<リポジトリ名>/app/?stage=0&view=quiz
```

ローカル：

```text
http://127.0.0.1:8766/
http://127.0.0.1:8766/app/
http://127.0.0.1:8766/app/?stage=0&view=quiz
```

## 完了条件

- ルートURLからCodoriへ入れる。
- `app/`が表示される。
- `assets/`配下の鳥画像、ロゴ、運指画像が表示される。
- 音あて画面で「土台の音」ボタンが表示される。
- 旧候補フォルダ`assets/app/characters/action-candidate-2026-05-27/`が公開成果物に含まれない。
- 公開URLを共有できる。

## 注意点

外部公開するため、未公開にしたい素材や権利確認前の素材がある場合は、公開前に除外方針を決める。

現状の判断では、CodoriはMVP確認用として公開できる構成だが、本番公開前には以下を確認する。

- 画像素材の利用範囲
- 音声素材の有無と権利
- 公開したくないレビュー画像の扱い
- 独自ドメインを使うか
- 進捗保存がローカル保存のみでよいか
