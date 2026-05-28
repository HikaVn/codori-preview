import AppKit
import Foundation

struct Variant {
    let id: String
    let title: String
    let note: String
    let lines: [String]
    let output: String
}

func usage() -> Never {
    fputs("usage: swift render_cadd9_text_variants.swift <outputDir>\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 2 else { usage() }

let outputDir = URL(fileURLWithPath: args[1], isDirectory: true)
let root = FileManager.default.currentDirectoryPath
let input = "\(root)/assets/rough/stickers/pilot/pilot_add9_waa_2026-05-20_001.png"

let variants = [
    Variant(
        id: "A",
        title: "Cadd9",
        note: "1-line official",
        lines: ["Cadd9"],
        output: "pilot_add9_Cadd9_variant_A_1line_2026-05-21_001.png"
    ),
    Variant(
        id: "B",
        title: "C add9",
        note: "space readable",
        lines: ["C add9"],
        output: "pilot_add9_Cadd9_variant_B_space_2026-05-21_001.png"
    ),
    Variant(
        id: "C",
        title: "C / add9",
        note: "2-line largest",
        lines: ["C", "add9"],
        output: "pilot_add9_Cadd9_variant_C_2line_2026-05-21_001.png"
    ),
    Variant(
        id: "D",
        title: "Cadd9 compact",
        note: "1-line tighter",
        lines: ["Cadd9"],
        output: "pilot_add9_Cadd9_variant_D_compact_2026-05-21_001.png"
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

let canvas = 1024
let fill = color("#1E5AA8")
let stroke = NSColor.white
let shadowColor = color("#16304F", alpha: 0.24)

func fontFor(_ text: String, maxWidth: CGFloat, maxSize: CGFloat, minSize: CGFloat) -> NSFont {
    var size = maxSize
    while size >= minSize {
        let font = NSFont(name: "HiraginoSans-W7", size: size)
            ?? NSFont.systemFont(ofSize: size, weight: .bold)
        let width = (text as NSString).size(withAttributes: [.font: font]).width
        if width <= maxWidth { return font }
        size -= 2
    }
    return NSFont(name: "HiraginoSans-W7", size: minSize)
        ?? NSFont.systemFont(ofSize: minSize, weight: .bold)
}

func drawText(_ variant: Variant, in rect: NSRect) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    paragraph.lineSpacing = -10

    let shadow = NSShadow()
    shadow.shadowColor = shadowColor
    shadow.shadowOffset = NSSize(width: 4, height: -4)
    shadow.shadowBlurRadius = 2.0

    if variant.lines.count == 1 {
        let text = variant.lines[0]
        let compact = variant.id == "D"
        let font = fontFor(
            text,
            maxWidth: rect.width * (compact ? 0.94 : 0.88),
            maxSize: compact ? 128 : 118,
            minSize: 86
        )
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: fill,
            .strokeColor: stroke,
            .strokeWidth: compact ? -7.0 : -8.5,
            .paragraphStyle: paragraph,
            .shadow: shadow
        ]
        (text as NSString).draw(
            with: rect,
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attrs
        )
        return
    }

    let topFont = fontFor("C", maxWidth: rect.width * 0.6, maxSize: 100, minSize: 86)
    let bottomFont = fontFor("add9", maxWidth: rect.width * 0.86, maxSize: 82, minSize: 64)

    let topAttrs: [NSAttributedString.Key: Any] = [
        .font: topFont,
        .foregroundColor: fill,
        .strokeColor: stroke,
        .strokeWidth: -8.0,
        .paragraphStyle: paragraph,
        .shadow: shadow
    ]
    let bottomAttrs: [NSAttributedString.Key: Any] = [
        .font: bottomFont,
        .foregroundColor: fill,
        .strokeColor: stroke,
        .strokeWidth: -7.5,
        .paragraphStyle: paragraph,
        .shadow: shadow
    ]

    ("C" as NSString).draw(
        with: NSRect(x: rect.minX, y: rect.minY + 58, width: rect.width, height: 80),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: topAttrs
    )
    ("add9" as NSString).draw(
        with: NSRect(x: rect.minX, y: rect.minY + 2, width: rect.width, height: 72),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: bottomAttrs
    )
}

func drawSticker(variant: Variant) -> NSBitmapImageRep? {
    guard let source = NSImage(contentsOfFile: input) else {
        fputs("failed to read image: \(input)\n", stderr)
        return nil
    }
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: canvas,
        pixelsHigh: canvas,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        return nil
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: canvas, height: canvas).fill()

    source.draw(
        in: NSRect(x: 86, y: 172, width: 852, height: 852),
        from: .zero,
        operation: .sourceOver,
        fraction: 1.0
    )

    drawText(variant, in: NSRect(x: 42, y: 24, width: 940, height: 176))
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func write(_ rep: NSBitmapImageRep, to url: URL) throws {
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "CodoriRender", code: 1)
    }
    try data.write(to: url)
}

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

var rendered: [(Variant, NSBitmapImageRep)] = []
for variant in variants {
    guard let rep = drawSticker(variant: variant) else { continue }
    try write(rep, to: outputDir.appendingPathComponent(variant.output))
    rendered.append((variant, rep))
}

let sheetSize = 2048
guard let sheet = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: sheetSize,
    pixelsHigh: sheetSize,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fputs("failed to create sheet\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheet)
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: sheetSize, height: sheetSize).fill()

let titleParagraph = NSMutableParagraphStyle()
titleParagraph.alignment = .left
let titleAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 34, weight: .bold),
    .foregroundColor: color("#24323A"),
    .paragraphStyle: titleParagraph
]
let noteAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 22, weight: .medium),
    .foregroundColor: color("#5A6870"),
    .paragraphStyle: titleParagraph
]

for (index, pair) in rendered.enumerated() {
    let col = index % 2
    let row = index / 2
    let x = CGFloat(col * canvas)
    let y = CGFloat((1 - row) * canvas)
    let bg = (row + col) % 2 == 0 ? color("#FAFAF7") : color("#F4F8FA")
    bg.setFill()
    NSRect(x: x, y: y, width: CGFloat(canvas), height: CGFloat(canvas)).fill()

    let image = NSImage(size: NSSize(width: canvas, height: canvas))
    image.addRepresentation(pair.1)
    image.draw(
        in: NSRect(x: x, y: y, width: CGFloat(canvas), height: CGFloat(canvas)),
        from: .zero,
        operation: .sourceOver,
        fraction: 1.0
    )

    ("\(pair.0.id) \(pair.0.title)" as NSString).draw(
        with: NSRect(x: x + 36, y: y + 950, width: 520, height: 44),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: titleAttrs
    )
    (pair.0.note as NSString).draw(
        with: NSRect(x: x + 36, y: y + 918, width: 520, height: 34),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: noteAttrs
    )
}

NSGraphicsContext.restoreGraphicsState()
try write(sheet, to: outputDir.appendingPathComponent("pilot_add9_Cadd9_variants_sheet_2026-05-21_001.png"))
