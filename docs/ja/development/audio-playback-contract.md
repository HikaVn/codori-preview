# Codori音声APIの契約

## 基準と原因

コード音の基準は公開版 `deeccb6` の音カード。基音+第2倍音0.2、音ごとのアタック25ms、従来ゲート1.15秒、リリース1.45秒、ストラム100msを維持する。マスターと各音の既存の二段エンベロープも既定条件では維持する。

`b33a017` の機能和声は `durationSeconds: 0.75` で全エンベロープを `0.75/2.6` 倍に圧縮していた。さらに1.15秒ごとの次音が既存音の全体停止を呼び、余韻と音価が混同されていた。曲側にも音符長に合わせて減衰を縮める別の実装があった。

## 所有者と公開API

合成音の唯一の所有者は `app/audio-engine.js` の `CodoriAudio`。画面はAudioContextの確保・曲データ・進捗を管理してよいが、oscillatorやエンベロープを作らない。新しい画面のコードに `createOscillator` があればCIで失敗する。

通常のアプリ画面は既存の `playChord(chord, options)` を呼ぶ。根音補助は `playSyntheticTone`、コード図は `playDiagramNote`。機能和声の全画面は同じ `playHarmonyChord` アダプターから `playChord` へ入る。

低レベルの曲・譜面アダプターだけは次のAPIを使う。

```js
const voice = CodoriAudio.forContext(context).play({
  profile: "ukulele",       // 中央登録された音色名
  frequencies: [261.63, 329.63, 392],
  gateSeconds: noteBeats * secondsPerBeat, // 音価。リリースではない
  startTime: scheduledTime,
  performance: "rhythmic", // 意図的な30msストラム。通常は100ms
  gain: accentGain
});
voice.noteOff(chordChangeTime); // 自然なノートオフ。固定リリースで減衰
voice();                       // ユーザー停止・キャンセル。20msでゼロへ
```

`durationSeconds` / `releaseSeconds` / `attackSeconds` / `partials` を画面から渡すと例外になる。リリースを音価で倍率変更しない。音色の変更は所有モジュールの登録プロファイルで行い、波形の比較結果と理由を残す。通常のコード音のプロファイルを機能名で複製しない。

## 音価・自然減衰・停止

- ゲートは楽譜や奏法に由来する保持時間。スタッカート・テヌート・アクセント・スウィング・テンポは演奏側で維持する。
- リリースは音色に固定。`ukulele`は1.45秒、根音補助`reference`は従来の0.35秒。実際の-60dB到達時間は二段エンベロープ・位相・ストラムの影響を受ける。
- ピアノは従来の倍音・アタックと2.6秒の自然減衰を保持し、短いゲートでは固定90msのダンパーを使う。音符長に合わせてピアノの減衰曲線を圧縮しない。
- 譜面の持続音は別音色として登録した`score-melody` / `score-chord` / `score-piano`。固定90msのリリースを使う。打楽器的なコード音に勝手に置き換えない。
- ユーザー停止・再生やり直し・画面遷移はノートオフと区別し、共通の20ms線形フェードでゼロへ落とす。未発音の予約音も取り消す。AudioParam.valueではなく、所有者が追跡した自動化のその時点の値からフェードする。
- 新音への自然な余韻の重なりは許可する。逐次再生中に次音ごとにstopAllを呼ばない。再生グループを中断する時だけ全ハンドルを停止する。音声所有者は即時再生の重なりを32グループに制限し、終了時にノードを切断する。譜面は未来の音をまとめて予約するため、予約全体の件数で冒頭の音を捨てない。停止時は未来の予約も含めてすべて取り消す。

## 再生タイミング

通常の連続コードは従来の950ms間隔を共通ポリシーから読む。機能和声の文脈と問題の間は共通の700ms。最終和音は実際の音声ハンドルの終了時間まで待ち、正解を有効化する。画面に独自のリリース・強制カット時刻を置かない。

## 回帰チェック

Hermeticの既定ゲート:

```sh
node tools/test-audio-contract.mjs
node tools/test-functional-harmony-integration.mjs
node tools/test-functional-harmony.mjs
node tools/test-harmony-deck.mjs
node tools/test-practice-navigation.mjs
```

ネイティブの定量検証（明示起動・無音）は `tools/test-audio-waveforms.mjs`。既存PlaywrightとChromiumのパスを `PLAYWRIGHT_MODULE` / `CHROMIUM_EXECUTABLE`、ローカルサーバーを `CODORI_TEST_URL`、出力先を `CODORI_TEST_OUTPUT` で渡す。実際のOfflineAudioContextで48kHzレンダリングし、旧基準・カード・音あて・解説・練習・実践・曲・譜面を比較する。自然減衰と停止後の残音、将来時刻の音の取り消し、連打を別々に検証する。ユーザーのスピーカーや保存履歴には触れない。

凍結した旧音源は `tools/fixtures/legacy-audio-reference.js`。現在実装から期待値を作り直さない。`deeccb6`のカードと`b33a017`の不具合版・ピアノを独立した比較対象にする。
