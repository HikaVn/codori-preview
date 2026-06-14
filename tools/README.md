# 楽譜認識テスト基盤

PDF/MusicXML 認識を「正解つきのテスト譜」で機械的に検証するツール群。
付点四分休符のような記号が、認識・描画で正しく扱えているかを自動で確かめる。

## 仕組み（ループを閉じる）

```
① gen-test-corpus.mjs で MusicXML(正解つき) を生成
        ↓
② Sibelius 等で浄書 → PDF 書き出し           （PDF認識経路をテストする場合）
        ↓
③ Codori「楽譜とりこみ」で読み込み → SVG書き出し（認識データ埋め込み）
        ↓
④ compare.mjs で 認識結果 vs 正解 を照合 → 記号別レポート
```

MusicXML を Codori に直接読み込めば（②を飛ばして）**MusicXML取り込み経路**のテストになり、
②③を通せば**PDF認識経路**（pdfscore.js）のテストになる。休符はPDF認識経路でのみ照合できる
（MusicXML取り込みは休符を保持しないため）。

## 使い方

### 1. テスト譜と正解を生成
```
node tools/gen-test-corpus.mjs
# → tools/corpus/rhythm-test.musicxml     （Sibelius等で開く元）
# → tools/corpus/rhythm-test.truth.json   （完璧な認識が返すべき正解）
```
網羅内容: 全〜32分の音価×付点 / 各種休符×付点（**付点四分休符**含む） / 臨時記号 /
タイ / 連桁 / 調号 / 拍子(4/4・3/4)。1小節=1パターンでラベル付き。

### 2.（PDF経路）Sibelius で PDF 化
- 最短・確実: Sibelius 同梱の Batch Processing プラグイン
  - `Plug-ins > Batch Processing > Export Folder as PDF`
- 自動化の雛形: `tools/sibelius/BatchExportPDF.plg`（PDF書き出しのメソッド名はバージョン要確認）

### 3. Codori で認識して SVG 書き出し
- 「楽譜とりこみ」で PDF（または MusicXML）を読み込む
- 「SVG書き出し」を押す（認識データが metadata に埋め込まれる）

### 4. 照合
```
node tools/compare.mjs <Codoriが書き出したSVG または 認識JSON> tools/corpus/rhythm-test.truth.json
```
出力例（PDF認識経路）:
```
=== 音符 ===
  一致 66/66  音価ちがい 0  欠落 0  余分 0
=== 休符（種別ごとの個数）===
  OK  dotted-quarter: 正解1 / 認識1   ← 付点四分休符
  OK  whole: 正解2 / 認識2
  ...
=== 調号: OK  拍子: OK ===
```

## よく使う音符・記号のカバレッジ

| 記号 | PDF認識 (pdfscore) | MusicXML取り込み (musicxml) |
|---|---|---|
| 音価 全〜32分 | ✓ | ✓ |
| 付点（音符・休符） | ✓ | ✓ |
| 休符 全〜16分＋付点 | ✓（種類＋付点を保持） | ✗（素通り） |
| 臨時記号 ♯♭♮ | ✓ | ✓（音高に反映） |
| 調号 0–7／転調 | ✓ ／ ✓ | ✓ ／ −（曲頭のみ） |
| タイ／スラー | ✓ ／ ✓ | ✓ ／ ✗ |
| 連桁（傾き対応） | ✓ | ✓ |
| 拍子 4/4・3/4・2/4・6/8 | ✓ | ✓ |
| 3連符・連符 | ✗（未対応） | ✓（1/48グリッド） |
| コード／歌詞 | ✓ ／ ✓ | ✓ ／ ✓ |
| 繰り返し（リピート/1番2番/D.S.） | ✗ | ✗ |
| アーティキュレーション（スタッカート等） | ✗ | ✗ |

このハーネスで検出・修正した例:
- MusicXML取り込みの**タイ未対応** → 結合するよう修正
- MusicXML取り込みが**調号(fifths)を読まない** → 読むよう修正
- **3連符が1/16量子化で潰れる** → 1/48グリッドにして対応
- MusicXML取り込みは**休符を保持しない**（休符照合はPDF認識経路で）

## ファイル
| ファイル | 役割 |
|---|---|
| `gen-test-corpus.mjs` | 正解つきテストMusicXMLを生成（純Node） |
| `compare.mjs` | 認識結果 vs 正解 を照合（純Node・CLI/モジュール両用） |
| `sibelius/BatchExportPDF.plg` | Sibelius一括PDF化プラグイン（雛形） |
| `corpus/` | 生成物（MusicXML / truth.json） |

## 今後
- 32分休符・複付点・連符の正解パターン追加
- 実浄書（Verovio/LilyPond）を組み込めば PDF認識経路も全自動化できる
