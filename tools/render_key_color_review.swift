import AppKit
import Foundation

struct KeyColor {
    let key: String
    let name: String
    let hex: String
}

struct Family {
    let id: String
    let label: String
    let chordSuffix: String
    let asset: String
    let expression: String
}

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
        throw NSError(domain: "CodoriKeyColorReview", code: 1)
    }
    try data.write(to: url)
}

func drawText(_ text: String, in rect: NSRect, font: NSFont, color: NSColor, alignment: NSTextAlignment = .center) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineBreakMode = .byTruncatingTail
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph
    ]
    (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs)
}

func drawPill(text: String, at point: NSPoint, fill: NSColor, textColor: NSColor) {
    let width: CGFloat = max(42, CGFloat(text.count) * 12 + 20)
    let rect = NSRect(x: point.x, y: point.y, width: width, height: 28)
    let path = NSBezierPath(roundedRect: rect, xRadius: 14, yRadius: 14)
    fill.setFill()
    path.fill()
    drawText(
        text,
        in: NSRect(x: rect.minX, y: rect.minY + 5, width: rect.width, height: 18),
        font: NSFont.monospacedSystemFont(ofSize: 14, weight: .bold),
        color: textColor
    )
}

func drawCharacter(_ image: NSImage, in rect: NSRect, tint: NSColor, tintFraction: CGFloat) {
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
    tint.withAlphaComponent(tintFraction).setFill()
    rect.fill(using: .sourceAtop)
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let outputDir = root.appendingPathComponent("assets/app/review/key-color-policy-2026-05-27", isDirectory: true)
try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

let keys: [KeyColor] = [
    .init(key: "C", name: "cream", hex: "#F6E7B8"),
    .init(key: "Db", name: "lilac", hex: "#D9C8F0"),
    .init(key: "D", name: "lemon", hex: "#F5E26B"),
    .init(key: "Eb", name: "smoky pink", hex: "#E7B2C4"),
    .init(key: "E", name: "mint", hex: "#A8DCC8"),
    .init(key: "F", name: "leaf", hex: "#9ED28B"),
    .init(key: "Gb", name: "teal", hex: "#78C7BF"),
    .init(key: "G", name: "sky", hex: "#86C7F2"),
    .init(key: "Ab", name: "lavender", hex: "#B9A4E4"),
    .init(key: "A", name: "coral", hex: "#F2A38F"),
    .init(key: "Bb", name: "rose", hex: "#D98AA8"),
    .init(key: "B", name: "deep blue", hex: "#4C6FAE")
]

let families: [Family] = [
    .init(id: "major", label: "Major", chordSuffix: "", asset: "assets/approved/characters/major.png", expression: "ほっとする安心顔"),
    .init(id: "minor", label: "minor", chordSuffix: "m", asset: "assets/approved/characters/minor.png", expression: "そっと寄り添う顔"),
    .init(id: "seventh", label: "7", chordSuffix: "7", asset: "assets/approved/characters/seventh.png", expression: "いたずらっぽく次へ誘う顔"),
    .init(id: "add9", label: "add9", chordSuffix: "add9", asset: "assets/approved/characters/add9.png", expression: "きらっと見上げる顔")
]

let images: [String: NSImage] = Dictionary(uniqueKeysWithValues: families.compactMap { family in
    let url = root.appendingPathComponent(family.asset)
    guard let image = NSImage(contentsOf: url) else {
        fputs("Failed to load \(url.path)\n", stderr)
        return nil
    }
    return (family.id, image)
})

guard images.count == families.count else {
    exit(1)
}

let margin: CGFloat = 28
let headerH: CGFloat = 88
let rowLabelW: CGFloat = 170
let cellW: CGFloat = 126
let cellH: CGFloat = 148
let sheetW = Int(margin * 2 + rowLabelW + cellW * CGFloat(keys.count))
let sheetH = Int(margin * 2 + headerH + cellH * CGFloat(families.count))
let sheet = makeBitmap(width: sheetW, height: sheetH)

let deepBlue = color("#1E5AA8")
let ink = color("#1B2F4A")
let lightLine = color("#D7E2EE")

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheet)

NSColor.white.setFill()
NSRect(x: 0, y: 0, width: sheetW, height: sheetH).fill()

drawText(
    "Codori key color review - initial 4 birds",
    in: NSRect(x: margin, y: CGFloat(sheetH) - margin - 30, width: CGFloat(sheetW) - margin * 2, height: 28),
    font: NSFont.systemFont(ofSize: 22, weight: .bold),
    color: deepBlue,
    alignment: .left
)
drawText(
    "Expression and pose stay fixed. Key changes are shown with soft color tint and a key pill.",
    in: NSRect(x: margin, y: CGFloat(sheetH) - margin - 58, width: CGFloat(sheetW) - margin * 2, height: 22),
    font: NSFont.systemFont(ofSize: 13, weight: .regular),
    color: ink.withAlphaComponent(0.72),
    alignment: .left
)

for (keyIndex, key) in keys.enumerated() {
    let x = margin + rowLabelW + CGFloat(keyIndex) * cellW
    let headerRect = NSRect(x: x, y: CGFloat(sheetH) - margin - headerH, width: cellW, height: 44)
    drawPill(text: key.key, at: NSPoint(x: x + (cellW - 52) / 2, y: headerRect.minY + 12), fill: color(key.hex), textColor: ink)
    drawText(
        key.name,
        in: NSRect(x: x + 4, y: headerRect.minY - 8, width: cellW - 8, height: 18),
        font: NSFont.systemFont(ofSize: 9, weight: .regular),
        color: ink.withAlphaComponent(0.68)
    )
}

for (familyIndex, family) in families.enumerated() {
    let rowY = CGFloat(sheetH) - margin - headerH - CGFloat(familyIndex + 1) * cellH
    let labelRect = NSRect(x: margin, y: rowY, width: rowLabelW - 12, height: cellH)
    NSColor(calibratedWhite: 0.98, alpha: 1).setFill()
    NSBezierPath(roundedRect: labelRect.insetBy(dx: 0, dy: 8), xRadius: 8, yRadius: 8).fill()
    drawText(
        family.label,
        in: NSRect(x: labelRect.minX + 12, y: rowY + cellH - 48, width: labelRect.width - 24, height: 24),
        font: NSFont.systemFont(ofSize: 20, weight: .bold),
        color: deepBlue,
        alignment: .left
    )
    drawText(
        family.expression,
        in: NSRect(x: labelRect.minX + 12, y: rowY + 44, width: labelRect.width - 24, height: 34),
        font: NSFont.systemFont(ofSize: 12, weight: .regular),
        color: ink.withAlphaComponent(0.78),
        alignment: .left
    )

    for (keyIndex, key) in keys.enumerated() {
        let x = margin + rowLabelW + CGFloat(keyIndex) * cellW
        let cellRect = NSRect(x: x + 6, y: rowY + 8, width: cellW - 12, height: cellH - 16)
        let bg = color(key.hex, alpha: 0.16)
        bg.setFill()
        NSBezierPath(roundedRect: cellRect, xRadius: 8, yRadius: 8).fill()
        lightLine.setStroke()
        let border = NSBezierPath(roundedRect: cellRect, xRadius: 8, yRadius: 8)
        border.lineWidth = 0.7
        border.stroke()

        guard let image = images[family.id] else { continue }
        let imageRect = NSRect(x: x + 20, y: rowY + 42, width: cellW - 40, height: 84)
        drawCharacter(image, in: imageRect, tint: color(key.hex), tintFraction: key.key == "B" ? 0.24 : 0.30)
        drawPill(text: key.key + family.chordSuffix, at: NSPoint(x: x + 28, y: rowY + 16), fill: color(key.hex), textColor: ink)
    }
}

NSGraphicsContext.restoreGraphicsState()

let sheetURL = outputDir.appendingPathComponent("codori_key_color_initial4_12keys_sheet.png")
try write(sheet, to: sheetURL)

let mobileW = 390
let mobileH = 520
let mobile = makeBitmap(width: mobileW, height: mobileH)

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: mobile)
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: mobileW, height: mobileH).fill()

drawText(
    "Key Color Mobile Check",
    in: NSRect(x: 18, y: mobileH - 42, width: mobileW - 36, height: 24),
    font: NSFont.systemFont(ofSize: 19, weight: .bold),
    color: deepBlue,
    alignment: .left
)

let sampleKeys = ["C", "F", "G", "A", "B"]
let sampleKeyData = keys.filter { sampleKeys.contains($0.key) }
let cardW: CGFloat = 166
let cardH: CGFloat = 136
for (index, family) in families.enumerated() {
    let row = index / 2
    let col = index % 2
    let x = CGFloat(18 + col * 184)
    let y = CGFloat(mobileH - 204 - row * 178)
    drawText(family.label, in: NSRect(x: x, y: y + cardH + 12, width: cardW, height: 18), font: NSFont.systemFont(ofSize: 14, weight: .bold), color: deepBlue, alignment: .left)
    for (keyIndex, key) in sampleKeyData.enumerated() {
        let chipX = x + CGFloat(keyIndex) * 30
        let chipY = y + cardH - 28
        drawPill(text: key.key, at: NSPoint(x: chipX, y: chipY), fill: color(key.hex), textColor: ink)
    }
    if let image = images[family.id] {
        drawCharacter(image, in: NSRect(x: x + 39, y: y + 22, width: 88, height: 88), tint: color(sampleKeyData[min(index, sampleKeyData.count - 1)].hex), tintFraction: 0.30)
    }
    drawText(family.expression, in: NSRect(x: x, y: y, width: cardW, height: 22), font: NSFont.systemFont(ofSize: 10, weight: .regular), color: ink.withAlphaComponent(0.75))
}

NSGraphicsContext.restoreGraphicsState()
try write(mobile, to: outputDir.appendingPathComponent("codori_key_color_mobile_sample.png"))

let readme = """
# Codori Key Color Review

These files are review previews, not final character assets.

- `codori_key_color_initial4_12keys_sheet.png`: 4 initial birds x 12 key colors.
- `codori_key_color_mobile_sample.png`: compact mobile readability sample.

The preview keeps bird species, expression, and pose fixed. Key differences are represented with a soft tint and key pill.
"""

try readme.write(to: outputDir.appendingPathComponent("README.md"), atomically: true, encoding: .utf8)

print(sheetURL.path)
