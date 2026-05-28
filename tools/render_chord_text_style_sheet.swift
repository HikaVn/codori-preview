import AppKit
import Foundation

struct Style {
    let id: String
    let title: String
    let fill: NSColor
    let stroke: NSColor
    let strokeWidth: CGFloat
    let shadow: NSColor
    let shadowBlur: CGFloat
    let fontName: String
    let note: String
}

func usage() -> Never {
    fputs("usage: swift render_chord_text_style_sheet.swift <output>\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 2 else { usage() }

let outputPath = args[1]

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

let root = FileManager.default.currentDirectoryPath
let birds: [(label: String, text: String, image: String)] = [
    ("Major", "C", "\(root)/assets/rough/stickers/pilot/pilot_major_yahho_2026-05-20_001.png"),
    ("minor", "Cm", "\(root)/assets/rough/stickers/pilot/pilot_minor_uun_2026-05-20_001.png"),
    ("7", "C7", "\(root)/assets/rough/stickers/pilot/pilot_seventh_ok_2026-05-20_002.png"),
    ("add9", "Cadd9", "\(root)/assets/rough/stickers/pilot/pilot_add9_waa_2026-05-20_001.png")
]

let styles = [
    Style(
        id: "A",
        title: "Charcoal",
        fill: color("#263238"),
        stroke: .white,
        strokeWidth: 7,
        shadow: color("#000000", alpha: 0.22),
        shadowBlur: 2,
        fontName: "HiraginoSans-W7",
        note: "most readable"
    ),
    Style(
        id: "B",
        title: "Deep Blue",
        fill: color("#1E5AA8"),
        stroke: .white,
        strokeWidth: 8,
        shadow: color("#16304F", alpha: 0.24),
        shadowBlur: 2,
        fontName: "HiraginoSans-W7",
        note: "music app feel"
    ),
    Style(
        id: "C",
        title: "Warm Coral",
        fill: color("#E4574F"),
        stroke: .white,
        strokeWidth: 8,
        shadow: color("#6E2720", alpha: 0.22),
        shadowBlur: 2,
        fontName: "HiraginoSans-W7",
        note: "cute sticker"
    ),
    Style(
        id: "D",
        title: "White Badge",
        fill: .white,
        stroke: color("#24323A"),
        strokeWidth: 10,
        shadow: color("#000000", alpha: 0.12),
        shadowBlur: 1,
        fontName: "HiraginoSans-W7",
        note: "transparent-safe"
    )
]

let cellW = 512
let cellH = 512
let headerH = 96
let canvasW = cellW * birds.count
let canvasH = headerH + cellH * styles.count

guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: canvasW,
    pixelsHigh: canvasH,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fputs("failed to create bitmap\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

NSColor.white.setFill()
NSRect(x: 0, y: 0, width: canvasW, height: canvasH).fill()

let labelParagraph = NSMutableParagraphStyle()
labelParagraph.alignment = .center

let headingAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 28, weight: .bold),
    .foregroundColor: color("#222222"),
    .paragraphStyle: labelParagraph
]

let subAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 18, weight: .medium),
    .foregroundColor: color("#555555"),
    .paragraphStyle: labelParagraph
]

for (col, bird) in birds.enumerated() {
    let x = col * cellW
    (bird.label as NSString).draw(
        with: NSRect(x: x, y: canvasH - 54, width: cellW, height: 32),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: headingAttrs
    )
    (bird.text as NSString).draw(
        with: NSRect(x: x, y: canvasH - 84, width: cellW, height: 26),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: subAttrs
    )
}

func drawChord(_ text: String, in rect: NSRect, style: Style) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center

    let maxFont: CGFloat = text.count >= 5 ? 78 : 110
    let minFont: CGFloat = 54
    var fontSize = maxFont
    var font = NSFont(name: style.fontName, size: fontSize)
        ?? NSFont.systemFont(ofSize: fontSize, weight: .bold)

    while fontSize > minFont {
        font = NSFont(name: style.fontName, size: fontSize)
            ?? NSFont.systemFont(ofSize: fontSize, weight: .bold)
        let width = (text as NSString).size(withAttributes: [.font: font]).width
        if width <= rect.width * 0.88 { break }
        fontSize -= 2
    }

    let shadow = NSShadow()
    shadow.shadowColor = style.shadow
    shadow.shadowOffset = NSSize(width: 3, height: -3)
    shadow.shadowBlurRadius = style.shadowBlur

    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: style.fill,
        .strokeColor: style.stroke,
        .strokeWidth: -style.strokeWidth,
        .paragraphStyle: paragraph,
        .shadow: shadow
    ]

    (text as NSString).draw(
        with: rect,
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: attrs
    )
}

for (row, style) in styles.enumerated() {
    for (col, bird) in birds.enumerated() {
        let x = col * cellW
        let y = canvasH - headerH - (row + 1) * cellH
        let cell = NSRect(x: x, y: y, width: cellW, height: cellH)

        if (row + col) % 2 == 0 {
            color("#FAFAF7").setFill()
        } else {
            color("#F4F8FA").setFill()
        }
        cell.fill()

        color("#E2E2DD").setStroke()
        NSBezierPath(rect: cell).stroke()

        guard let image = NSImage(contentsOfFile: bird.image) else {
            continue
        }
        image.draw(
            in: NSRect(x: x + 61, y: y + 112, width: 390, height: 390),
            from: .zero,
            operation: .sourceOver,
            fraction: 1.0
        )

        let styleText = "\(style.id) \(style.title)"
        let styleAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 20, weight: .semibold),
            .foregroundColor: color("#333333")
        ]
        (styleText as NSString).draw(
            with: NSRect(x: x + 18, y: y + cellH - 36, width: 210, height: 24),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: styleAttrs
        )

        let noteAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 15, weight: .regular),
            .foregroundColor: color("#666666")
        ]
        (style.note as NSString).draw(
            with: NSRect(x: x + 18, y: y + cellH - 58, width: 260, height: 22),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: noteAttrs
        )

        drawChord(
            bird.text,
            in: NSRect(x: x + 18, y: y + 28, width: cellW - 36, height: 92),
            style: style
        )
    }
}

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
    fputs("failed to encode png\n", stderr)
    exit(1)
}

do {
    let url = URL(fileURLWithPath: outputPath)
    try FileManager.default.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try png.write(to: url)
} catch {
    fputs("failed to write image: \(error)\n", stderr)
    exit(1)
}
