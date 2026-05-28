import AppKit
import Foundation

struct Sticker {
    let family: String
    let text: String
    let input: String
    let output: String
}

func usage() -> Never {
    fputs("usage: swift render_line_size_review.swift <outputDir>\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 2 else { usage() }

let outputDir = URL(fileURLWithPath: args[1], isDirectory: true)
let root = FileManager.default.currentDirectoryPath

let stickers = [
    Sticker(
        family: "major",
        text: "C",
        input: "\(root)/assets/rough/stickers/pilot/pilot_major_yahho_2026-05-20_001.png",
        output: "codori_line_review_01_C_major_370x320.png"
    ),
    Sticker(
        family: "minor",
        text: "Cm",
        input: "\(root)/assets/rough/stickers/pilot/pilot_minor_uun_2026-05-20_001.png",
        output: "codori_line_review_02_Cm_minor_370x320.png"
    ),
    Sticker(
        family: "seventh",
        text: "C7",
        input: "\(root)/assets/rough/stickers/pilot/pilot_seventh_ok_2026-05-20_002.png",
        output: "codori_line_review_03_C7_seventh_370x320.png"
    ),
    Sticker(
        family: "add9",
        text: "Cadd9",
        input: "\(root)/assets/rough/stickers/pilot/pilot_add9_waa_2026-05-20_001.png",
        output: "codori_line_review_04_Cadd9_add9_370x320.png"
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

let fill = color("#1E5AA8")
let shadowColor = color("#16304F", alpha: 0.24)

func fontFor(_ text: String, maxWidth: CGFloat, compactLongText: Bool) -> NSFont {
    let maxSize: CGFloat = text.count >= 5 ? (compactLongText ? 58 : 54) : 64
    let minSize: CGFloat = text.count >= 5 ? 42 : 48
    var size = maxSize
    while size >= minSize {
        let font = NSFont(name: "HiraginoSans-W7", size: size)
            ?? NSFont.systemFont(ofSize: size, weight: .bold)
        let width = (text as NSString).size(withAttributes: [.font: font]).width
        if width <= maxWidth { return font }
        size -= 1
    }
    return NSFont(name: "HiraginoSans-W7", size: minSize)
        ?? NSFont.systemFont(ofSize: minSize, weight: .bold)
}

func makeBitmap(width: Int, height: Int) -> NSBitmapImageRep? {
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
    )
}

func write(_ rep: NSBitmapImageRep, to url: URL) throws {
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "CodoriRender", code: 1)
    }
    try data.write(to: url)
}

func drawSticker(_ sticker: Sticker, width: Int, height: Int) -> NSBitmapImageRep? {
    guard let source = NSImage(contentsOfFile: sticker.input),
          let rep = makeBitmap(width: width, height: height) else {
        return nil
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()

    let imageSize: CGFloat = 252
    source.draw(
        in: NSRect(x: (CGFloat(width) - imageSize) / 2, y: 63, width: imageSize, height: imageSize),
        from: .zero,
        operation: .sourceOver,
        fraction: 1.0
    )

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center

    let shadow = NSShadow()
    shadow.shadowColor = shadowColor
    shadow.shadowOffset = NSSize(width: 2, height: -2)
    shadow.shadowBlurRadius = 1.2

    let textRect = NSRect(x: 10, y: 5, width: CGFloat(width - 20), height: 64)
    let compactLongText = sticker.family == "add9"
    let font = fontFor(
        sticker.text,
        maxWidth: textRect.width * (compactLongText ? 0.94 : 0.88),
        compactLongText: compactLongText
    )

    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: fill,
        .strokeColor: NSColor.white,
        .strokeWidth: compactLongText ? -5.5 : -6.5,
        .paragraphStyle: paragraph,
        .shadow: shadow
    ]

    (sticker.text as NSString).draw(
        with: textRect,
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: attrs
    )

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

var stickerReps: [(Sticker, NSBitmapImageRep)] = []
for sticker in stickers {
    guard let rep = drawSticker(sticker, width: 370, height: 320) else {
        continue
    }
    try write(rep, to: outputDir.appendingPathComponent(sticker.output))
    stickerReps.append((sticker, rep))
}

if let main = drawSticker(stickers[0], width: 240, height: 240) {
    try write(main, to: outputDir.appendingPathComponent("codori_line_review_main_240x240.png"))
}

if let tab = drawSticker(stickers[0], width: 96, height: 74) {
    try write(tab, to: outputDir.appendingPathComponent("codori_line_review_tab_96x74.png"))
}

let sheetW = 740
let sheetH = 640
if let sheet = makeBitmap(width: sheetW, height: sheetH) {
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheet)
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: sheetW, height: sheetH).fill()

    for (index, pair) in stickerReps.enumerated() {
        let col = index % 2
        let row = index / 2
        let x = CGFloat(col * 370)
        let y = CGFloat((1 - row) * 320)
        let image = NSImage(size: NSSize(width: 370, height: 320))
        image.addRepresentation(pair.1)
        image.draw(
            in: NSRect(x: x, y: y, width: 370, height: 320),
            from: .zero,
            operation: .sourceOver,
            fraction: 1.0
        )
    }

    NSGraphicsContext.restoreGraphicsState()
    try write(sheet, to: outputDir.appendingPathComponent("codori_line_review_4set_370x320_sheet.png"))
}

let readme = """
# Codori LINE Size Review

These files are size-check previews, not final submission assets.

- Sticker preview size: 370 x 320 px
- Main image preview: 240 x 240 px
- Chat tab preview: 96 x 74 px

Current previews still use rough white-background source images.
Final export must use transparent PNG artwork after background removal.
"""

try readme.write(
    to: outputDir.appendingPathComponent("README.md"),
    atomically: true,
    encoding: .utf8
)
