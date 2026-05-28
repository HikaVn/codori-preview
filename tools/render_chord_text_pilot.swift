import AppKit
import Foundation

struct Item {
    let family: String
    let text: String
    let input: String
    let output: String
}

func usage() -> Never {
    fputs("usage: swift render_chord_text_pilot.swift <outputDir>\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 2 else { usage() }

let outputDir = URL(fileURLWithPath: args[1], isDirectory: true)
let root = FileManager.default.currentDirectoryPath

let items = [
    Item(
        family: "major",
        text: "C",
        input: "\(root)/assets/rough/stickers/pilot/pilot_major_yahho_2026-05-20_001.png",
        output: "pilot_major_C_deep_blue_2026-05-21_002.png"
    ),
    Item(
        family: "minor",
        text: "Cm",
        input: "\(root)/assets/rough/stickers/pilot/pilot_minor_uun_2026-05-20_001.png",
        output: "pilot_minor_Cm_deep_blue_2026-05-21_002.png"
    ),
    Item(
        family: "seventh",
        text: "C7",
        input: "\(root)/assets/rough/stickers/pilot/pilot_seventh_ok_2026-05-20_002.png",
        output: "pilot_seventh_C7_deep_blue_2026-05-21_002.png"
    ),
    Item(
        family: "add9",
        text: "Cadd9",
        input: "\(root)/assets/rough/stickers/pilot/pilot_add9_waa_2026-05-20_001.png",
        output: "pilot_add9_Cadd9_deep_blue_compact_2026-05-21_002.png"
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

func chordFont(for text: String, maxWidth: CGFloat, compactLongText: Bool) -> NSFont {
    let maxSize: CGFloat = text.count >= 5 ? (compactLongText ? 128 : 118) : 144
    let minSize: CGFloat = text.count >= 5 ? 86 : 104
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

func drawSticker(item: Item) -> NSBitmapImageRep? {
    guard let source = NSImage(contentsOfFile: item.input) else {
        fputs("failed to read image: \(item.input)\n", stderr)
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

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center

    let shadow = NSShadow()
    shadow.shadowColor = shadowColor
    shadow.shadowOffset = NSSize(width: 4, height: -4)
    shadow.shadowBlurRadius = 2.0

    let textRect = NSRect(x: 42, y: 34, width: 940, height: 158)
    let compactLongText = item.family == "add9"
    let font = chordFont(
        for: item.text,
        maxWidth: textRect.width * (compactLongText ? 0.94 : 0.88),
        compactLongText: compactLongText
    )
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: fill,
        .strokeColor: stroke,
        .strokeWidth: compactLongText ? -7.0 : -8.5,
        .paragraphStyle: paragraph,
        .shadow: shadow
    ]

    (item.text as NSString).draw(
        with: textRect,
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: attrs
    )

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

var reps: [(Item, NSBitmapImageRep)] = []
for item in items {
    guard let rep = drawSticker(item: item) else { continue }
    let url = outputDir.appendingPathComponent(item.output)
    try write(rep, to: url)
    reps.append((item, rep))
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

for (index, pair) in reps.enumerated() {
    let col = index % 2
    let row = index / 2
    let x = CGFloat(col * canvas)
    let y = CGFloat((1 - row) * canvas)
    let image = NSImage(size: NSSize(width: canvas, height: canvas))
    image.addRepresentation(pair.1)
    image.draw(
        in: NSRect(x: x, y: y, width: CGFloat(canvas), height: CGFloat(canvas)),
        from: .zero,
        operation: .sourceOver,
        fraction: 1.0
    )
}

NSGraphicsContext.restoreGraphicsState()

try write(sheet, to: outputDir.appendingPathComponent("pilot_sticker_4set_deep_blue_compact_add9_2026-05-21_002.png"))
