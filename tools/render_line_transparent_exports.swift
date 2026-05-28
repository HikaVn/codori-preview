import AppKit
import Foundation

struct Sticker {
    let code: String
    let family: String
    let input: String
    let transparentName: String
    let stickerName: String
}

func usage() -> Never {
    fputs("usage: swift render_line_transparent_exports.swift <transparentDir> <stickerDir> [characterSourceDir]\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 3 || args.count == 4 else { usage() }

let transparentDir = URL(fileURLWithPath: args[1], isDirectory: true)
let stickerDir = URL(fileURLWithPath: args[2], isDirectory: true)
let root = FileManager.default.currentDirectoryPath
let characterSourceDir = args.count == 4
    ? URL(fileURLWithPath: args[3], isDirectory: true).path
    : "\(root)/assets/approved/characters"

let stickers = [
    Sticker(
        code: "C",
        family: "major",
        input: "\(characterSourceDir)/major.png",
        transparentName: "codori_character_01_C_major_transparent.png",
        stickerName: "codori_line_01_C_major.png"
    ),
    Sticker(
        code: "Cm",
        family: "minor",
        input: "\(characterSourceDir)/minor.png",
        transparentName: "codori_character_02_Cm_minor_transparent.png",
        stickerName: "codori_line_02_Cm_minor.png"
    ),
    Sticker(
        code: "C7",
        family: "seventh",
        input: "\(characterSourceDir)/seventh.png",
        transparentName: "codori_character_03_C7_seventh_transparent.png",
        stickerName: "codori_line_03_C7_seventh.png"
    ),
    Sticker(
        code: "Cadd9",
        family: "add9",
        input: "\(characterSourceDir)/add9.png",
        transparentName: "codori_character_04_Cadd9_add9_transparent.png",
        stickerName: "codori_line_04_Cadd9_add9.png"
    )
]

func color(_ hex: String, alpha: CGFloat = 1.0) -> NSColor {
    var value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    if value.count == 3 {
        value = value.map { "\($0)\($0)" }.joined()
    }
    var intValue: UInt64 = 0
    Scanner(string: value).scanHexInt64(&intValue)
    return NSColor(
        red: CGFloat((intValue >> 16) & 0xff) / 255.0,
        green: CGFloat((intValue >> 8) & 0xff) / 255.0,
        blue: CGFloat(intValue & 0xff) / 255.0,
        alpha: alpha
    )
}

func makeBitmap(width: Int, height: Int) -> NSBitmapImageRep {
    NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
}

func write(_ rep: NSBitmapImageRep, to url: URL) throws {
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "CodoriLineExport", code: 1)
    }
    try data.write(to: url)
}

func bitmap(from path: String) -> NSBitmapImageRep? {
    guard let image = NSImage(contentsOfFile: path) else { return nil }
    let width = Int(image.size.width)
    let height = Int(image.size.height)
    let rep = makeBitmap(width: width, height: height)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    image.draw(in: NSRect(x: 0, y: 0, width: width, height: height), from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func isBackgroundCandidate(red: UInt8, green: UInt8, blue: UInt8) -> Bool {
    let red = Int(red)
    let green = Int(green)
    let blue = Int(blue)
    let minValue = min(red, green, blue)
    let maxValue = max(red, green, blue)
    return minValue >= 236 && (maxValue - minValue) <= 18
}

func pixelOffset(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> Int {
    y * rep.bytesPerRow + x * 4
}

func pixel(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> (UInt8, UInt8, UInt8, UInt8) {
    let data = rep.bitmapData!
    let offset = pixelOffset(rep, x, y)
    return (data[offset], data[offset + 1], data[offset + 2], data[offset + 3])
}

func setPixel(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int, _ red: UInt8, _ green: UInt8, _ blue: UInt8, _ alpha: UInt8) {
    let data = rep.bitmapData!
    let offset = pixelOffset(rep, x, y)
    data[offset] = red
    data[offset + 1] = green
    data[offset + 2] = blue
    data[offset + 3] = alpha
}

func removeBorderWhiteBackground(_ source: NSBitmapImageRep) -> NSBitmapImageRep {
    let width = source.pixelsWide
    let height = source.pixelsHigh
    let result = makeBitmap(width: width, height: height)
    var visited = Array(repeating: false, count: width * height)
    var queue: [(Int, Int)] = []

    func index(_ x: Int, _ y: Int) -> Int { y * width + x }
    func enqueueIfBackground(_ x: Int, _ y: Int) {
        guard x >= 0, y >= 0, x < width, y < height else { return }
        let i = index(x, y)
        let pixelValue = pixel(source, x, y)
        guard !visited[i], isBackgroundCandidate(red: pixelValue.0, green: pixelValue.1, blue: pixelValue.2) else { return }
        visited[i] = true
        queue.append((x, y))
    }

    for x in 0..<width {
        enqueueIfBackground(x, 0)
        enqueueIfBackground(x, height - 1)
    }
    for y in 0..<height {
        enqueueIfBackground(0, y)
        enqueueIfBackground(width - 1, y)
    }

    var head = 0
    while head < queue.count {
        let (x, y) = queue[head]
        head += 1
        enqueueIfBackground(x + 1, y)
        enqueueIfBackground(x - 1, y)
        enqueueIfBackground(x, y + 1)
        enqueueIfBackground(x, y - 1)
    }

    for y in 0..<height {
        for x in 0..<width {
            let i = index(x, y)
            let sourcePixel = pixel(source, x, y)
            if visited[i] {
                setPixel(result, x, y, 0, 0, 0, 0)
            } else {
                setPixel(result, x, y, sourcePixel.0, sourcePixel.1, sourcePixel.2, sourcePixel.3)
            }
        }
    }

    return result
}

func boundingBox(of rep: NSBitmapImageRep, alphaThreshold: CGFloat = 0.02) -> NSRect {
    var minX = rep.pixelsWide
    var minY = rep.pixelsHigh
    var maxX = 0
    var maxY = 0
    var found = false

    for y in 0..<rep.pixelsHigh {
        for x in 0..<rep.pixelsWide {
            let alpha = CGFloat(pixel(rep, x, y).3) / 255.0
            guard alpha > alphaThreshold else { continue }
            found = true
            minX = min(minX, x)
            minY = min(minY, y)
            maxX = max(maxX, x)
            maxY = max(maxY, y)
        }
    }

    if !found {
        return NSRect(x: 0, y: 0, width: rep.pixelsWide, height: rep.pixelsHigh)
    }
    return NSRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

func sourceRectForDrawing(_ bbox: NSRect, in rep: NSBitmapImageRep) -> NSRect {
    NSRect(
        x: bbox.minX,
        y: CGFloat(rep.pixelsHigh) - bbox.maxY,
        width: bbox.width,
        height: bbox.height
    )
}

let textFill = color("#1E5AA8")
let textShadow = color("#16304F", alpha: 0.24)

func fontFor(_ text: String, maxWidth: CGFloat) -> NSFont {
    let maxSize: CGFloat = text.count >= 5 ? 52 : 70
    let minSize: CGFloat = text.count >= 5 ? 38 : 48
    let fontCandidates = [
        "ArialRoundedMTBold",
        "ChalkboardSE-Bold",
        "ComicSansMS-Bold",
        "MarkerFelt-Wide",
        "HiraginoSans-W7"
    ]
    var size = maxSize
    while size >= minSize {
        let font = fontCandidates.compactMap { NSFont(name: $0, size: size) }.first
            ?? NSFont.systemFont(ofSize: size, weight: .bold)
        let width = (text as NSString).size(withAttributes: [.font: font]).width
        if width <= maxWidth { return font }
        size -= 1
    }
    return NSFont.systemFont(ofSize: minSize, weight: .bold)
}

func image(from rep: NSBitmapImageRep) -> NSImage {
    let image = NSImage(size: NSSize(width: rep.pixelsWide, height: rep.pixelsHigh))
    image.addRepresentation(rep)
    return image
}

func drawCodeText(_ text: String, in rect: NSRect) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center

    let shadow = NSShadow()
    shadow.shadowColor = textShadow
    shadow.shadowOffset = NSSize(width: 2, height: -2)
    shadow.shadowBlurRadius = 1.2

    let font = fontFor(text, maxWidth: rect.width * (text.count >= 5 ? 0.94 : 0.86))
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: textFill,
        .strokeColor: NSColor.white,
        .strokeWidth: text.count >= 5 ? -5.5 : -6.5,
        .paragraphStyle: paragraph,
        .shadow: shadow
    ]

    (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs)
}

func renderSticker(character: NSBitmapImageRep, code: String) -> NSBitmapImageRep {
    let canvas = makeBitmap(width: 370, height: 320)
    let bbox = boundingBox(of: character)
    let sourceRect = sourceRectForDrawing(bbox, in: character)
    let charImage = image(from: character)
    let isLongCode = code.count >= 5
    let maxCharW: CGFloat = isLongCode ? 226 : 250
    let maxCharH: CGFloat = isLongCode ? 216 : 224
    let scale = min(maxCharW / bbox.width, maxCharH / bbox.height)
    let drawW = bbox.width * scale
    let drawH = bbox.height * scale
    let x = (370 - drawW) / 2
    let y: CGFloat = isLongCode ? 86 : 76
    let textRect = isLongCode
        ? NSRect(x: 8, y: 10, width: 354, height: 62)
        : NSRect(x: 10, y: 11, width: 350, height: 70)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: canvas)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: 370, height: 320).fill()
    charImage.draw(
        in: NSRect(x: x, y: y, width: drawW, height: drawH),
        from: sourceRect,
        operation: .sourceOver,
        fraction: 1.0
    )
    drawCodeText(code, in: textRect)
    NSGraphicsContext.restoreGraphicsState()
    return canvas
}

func renderMainImage(character: NSBitmapImageRep) -> NSBitmapImageRep {
    let canvas = makeBitmap(width: 240, height: 240)
    let bbox = boundingBox(of: character)
    let sourceRect = sourceRectForDrawing(bbox, in: character)
    let charImage = image(from: character)
    let scale = min(202 / bbox.width, 202 / bbox.height)
    let drawW = bbox.width * scale
    let drawH = bbox.height * scale

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: canvas)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: 240, height: 240).fill()
    charImage.draw(
        in: NSRect(x: (240 - drawW) / 2, y: (240 - drawH) / 2, width: drawW, height: drawH),
        from: sourceRect,
        operation: .sourceOver,
        fraction: 1.0
    )
    NSGraphicsContext.restoreGraphicsState()
    return canvas
}

func renderTabImage(character: NSBitmapImageRep) -> NSBitmapImageRep {
    let canvas = makeBitmap(width: 96, height: 74)
    let bbox = boundingBox(of: character)
    let sourceRect = sourceRectForDrawing(bbox, in: character)
    let charImage = image(from: character)
    let scale = min(78 / bbox.width, 62 / bbox.height)
    let drawW = bbox.width * scale
    let drawH = bbox.height * scale

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: canvas)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: 96, height: 74).fill()
    charImage.draw(
        in: NSRect(x: (96 - drawW) / 2, y: (74 - drawH) / 2, width: drawW, height: drawH),
        from: sourceRect,
        operation: .sourceOver,
        fraction: 1.0
    )
    NSGraphicsContext.restoreGraphicsState()
    return canvas
}

func displayPath(_ path: String) -> String {
    let rootPrefix = root.hasSuffix("/") ? root : "\(root)/"
    if path.hasPrefix(rootPrefix) {
        return String(path.dropFirst(rootPrefix.count))
    }
    return path
}

try FileManager.default.createDirectory(at: transparentDir, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: stickerDir, withIntermediateDirectories: true)

var renderedStickers: [(Sticker, NSBitmapImageRep)] = []
var transparentCharacters: [String: NSBitmapImageRep] = [:]

for sticker in stickers {
    guard let source = bitmap(from: sticker.input) else {
        fputs("Failed to load \(sticker.input)\n", stderr)
        continue
    }
    let transparent = removeBorderWhiteBackground(source)
    try write(transparent, to: transparentDir.appendingPathComponent(sticker.transparentName))
    transparentCharacters[sticker.family] = transparent

    let stickerRep = renderSticker(character: transparent, code: sticker.code)
    try write(stickerRep, to: stickerDir.appendingPathComponent(sticker.stickerName))
    renderedStickers.append((sticker, stickerRep))
}

if let major = transparentCharacters["major"] {
    try write(renderMainImage(character: major), to: stickerDir.appendingPathComponent("codori_line_main_240x240.png"))
    try write(renderTabImage(character: major), to: stickerDir.appendingPathComponent("codori_line_tab_96x74.png"))
}

let sheet = makeBitmap(width: 740, height: 640)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheet)
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: 740, height: 640).fill()
for (index, pair) in renderedStickers.enumerated() {
    let col = index % 2
    let row = index / 2
    let image = image(from: pair.1)
    image.draw(
        in: NSRect(x: CGFloat(col * 370), y: CGFloat((1 - row) * 320), width: 370, height: 320),
        from: .zero,
        operation: .sourceOver,
        fraction: 1.0
    )
}
NSGraphicsContext.restoreGraphicsState()
try write(sheet, to: stickerDir.appendingPathComponent("codori_line_4set_sheet.png"))

let readme = """
# Codori LINE透過PNG書き出し

指定されたキャラクター素材から生成した、LINEスタンプ派生用の候補画像です。

## キャラクター参照元

```text
\(displayPath(characterSourceDir))
```

## 透明キャラクター素材

参照元：

```text
\(displayPath(transparentDir.path))
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

- Font: `Arial Rounded Bold`
- Fallback: `Chalkboard SE Bold`, `Comic Sans MS Bold`, `Marker Felt`, `Hiragino Sans`
- Color: Deep Blue

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
"""

try readme.write(to: stickerDir.appendingPathComponent("README.md"), atomically: true, encoding: .utf8)
