# Codori 正式4鳥 羽先端タッチアップ候補結果

## このファイルについて

このファイルは、正式4鳥の羽先端をC基準に揃えるための、非破壊タッチアップ候補の結果メモです。

元の正式素材は上書きしない。
前回候補は正式不採用として固定する。

結論：

```text
現段階では羽先端を追加修正しない。
assets/approved/characters/ の正式4鳥を維持する。
アプリMVPとLINE候補は、現行正式4鳥ベースで継続する。
```

---

# 対象

基準素材：

```text
assets/approved/characters/
```

前回候補素材：

```text
assets/touchups/wingtip-candidate-2026-05-22/characters/
```

撤回候補素材：

```text
assets/touchups/wingtip-revert-candidate-2026-05-22/characters/
```

注意：

```text
撤回候補は確認用アーカイブ。
正式素材への反映対象ではなく、現在の正式ラインは assets/approved/characters/ のまま。
```

---

# タッチアップ方針

基準：

```text
Cの羽先端にある、小さな丸い2山の割れ
```

前回候補の反映内容：

- C / Major は基準として変更しない
- Cm / minor は見えている抱え羽の先端だけ、控えめな2山の割れを追加
- C7 / Seventh は上げ羽の見えている先端だけ、C基準の割れを追加
- Cadd9 / add9 は見えている側面羽の先端だけ、C基準の割れを追加
- 体や角度で隠れる羽先は、無理に割れを見せない

ユーザー確認結果：

- Cmの変化はNG。割れが輪郭線ではなく、内側に足した線に見える。
- C7の変化もNG。割れ位置が外側寄りで、Cのお手本から外れる。
- Cadd9は左手側だけ割れておらず、不均衡に見える。
- Cのお手本は、線を足すのではなく、輪郭そのものの小さな丸い凹みとして成立している。

判断：

```text
前回の割れ追加候補は不採用。
ラスター局所編集で品質を保てないため、追加割れ線は撤回する。
```

---

# 生成ファイル

## 前回キャラクター候補 不採用

```text
assets/touchups/wingtip-candidate-2026-05-22/characters/major.png
assets/touchups/wingtip-candidate-2026-05-22/characters/minor.png
assets/touchups/wingtip-candidate-2026-05-22/characters/seventh.png
assets/touchups/wingtip-candidate-2026-05-22/characters/add9.png
```

この候補は、正式反映しない。

## 追加割れ撤回候補

```text
assets/touchups/wingtip-revert-candidate-2026-05-22/characters/major.png
assets/touchups/wingtip-revert-candidate-2026-05-22/characters/minor.png
assets/touchups/wingtip-revert-candidate-2026-05-22/characters/seventh.png
assets/touchups/wingtip-revert-candidate-2026-05-22/characters/add9.png
```

この候補は、正式4鳥の元画像に戻したもの。
追加した割れ線を含まない。

## LINE候補

```text
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_01_C_major.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_02_Cm_minor.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_03_C7_seventh.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_04_Cadd9_add9.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_main_240x240.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_tab_96x74.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/export/stickers/codori_line_4set_sheet.png
```

## 透過エッジ確認

```text
assets/touchups/wingtip-revert-candidate-2026-05-22/line/review/edge-check/codori_line_edge_review_checker_dark_2026-05-22.png
assets/touchups/wingtip-revert-candidate-2026-05-22/line/review/edge-check/codori_line_tab_edge_review_2026-05-22.png
```

---

# 確認結果

## LINEサイズ

| 種類 | サイズ | 結果 |
|---|---:|---|
| スタンプ候補4個 | 370 x 320 | OK |
| メイン画像 | 240 x 240 | OK |
| タブ画像 | 96 x 74 | OK |

## 鳥面積

確認コマンド：

```sh
swift tools/check_line_character_area.swift assets/touchups/wingtip-revert-candidate-2026-05-22/line/source/transparent
```

| コード | C比 | 判定 |
|---|---:|---|
| C | 0.0% | OK |
| Cm | -1.5% | OK |
| C7 | -1.6% | OK |
| Cadd9 | -4.8% | OK |

## 目サイズ

確認コマンド：

```sh
swift tools/check_character_eye_size.swift assets/touchups/wingtip-revert-candidate-2026-05-22/line/source/transparent
```

| コード | C比 | 判定 |
|---|---:|---|
| C | 0.0% | OK |
| Cm | -7.8% | OK |
| C7 | +5.3% | OK |
| Cadd9 | +0.3% | OK |

---

# 判断

- 前回の羽先端追加候補は不採用。
- 追加割れ線は撤回する。
- ラスター局所編集では、Cのお手本と同品質の自然な輪郭割れを保ちにくい。
- 現段階では、正式4鳥の元画像を維持する。
- アプリMVPとLINE候補は、現行正式4鳥ベースへ戻して継続する。
- Cadd9の鳥全体はC比約5%小さめを維持。
- 370 x 320実寸で、Cadd9のコード名は読める。
- 96 x 74タブ画像はMajor単体で成立。
- `assets/approved/characters/` は上書きしない。

---

# 次に確認すること

- 羽先を揃える場合は、ラスター線足しではなく、次回の画像生成・描き直しで行う。
- その際は、割れを「追加線」ではなく「輪郭の小さな丸い凹み」として指定する。
- もし品質を保てない場合は、正式仕様を「羽先割れなし優先」に変更する。
- 次の制作対象は、アプリMVP確認またはLINE派生確認へ戻す。

---

# 今回やらないこと

- 全体再デザイン
- 新キャラ追加
- 12キー展開
- LINE本番申請
