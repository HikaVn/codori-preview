# Codori LINE透過PNG書き出し

指定されたキャラクター素材から生成した、LINEスタンプ派生用の候補画像です。

## キャラクター参照元

```text
assets/approved/characters
```

## 透明キャラクター素材

参照元：

```text
assets/line/source/transparent
```

## スタンプ候補

- `codori_line_01_C_major.png`
- `codori_line_02_Cm_minor.png`
- `codori_line_03_C7_seventh.png`
- `codori_line_04_Cadd9_add9.png`
- `codori_line_main_240x240.png`
- `codori_line_tab_96x74.png`
- `codori_line_4set_sheet.png`

## 文字スタイル

- フォント: `Arial Rounded Bold`
- 代替フォント: `Chalkboard SE Bold`, `Comic Sans MS Bold`, `Marker Felt`, `Hiragino Sans`
- 色: Deep Blue

## 鳥サイズ基準

- Cの鳥面積を基準にする
- 他の鳥はC比 +/-10% に収める
- 確認コマンド: `swift tools/check_line_character_area.swift`

## 目サイズ基準

- Cの平均目面積を基準にする
- 他の鳥はC比 +/-10% に収める
- 目の差が出ないことを優先する
- 確認コマンド: `swift tools/check_character_eye_size.swift`

これらは制作候補であり、LINE本番申請用の最終ファイルではありません。
本番提出前に、透過エッジ、公式サイズ要件、サウンド付きスタンプ要件を再確認してください。
