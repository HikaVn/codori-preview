import AppKit
import Foundation

func usage() -> Never {
    fputs("usage: swift render_sticker_text.swift <input> <output> <text> <hexColor> [fontSize]\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count >= 5 else { usage() }

let inputPath = args[1]
let outputPath = args[2]
let text = args[3]
let hexColor = args[4]
let fontSize = args.count >= 6 ? (Double(args[5]) ?? 104.0) : 104.0

func color(from hex: String) -> NSColor {
    var value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    if value.count == 3 {
        value = value.map { "\($0)\($0)" }.joined()
    }

    var intValue: UInt64 = 0
    Scanner(string: value).scanHexInt64(&intValue)

    let red = CGFloat((intValue >> 16) & 0xff) / 255.0
    let green = CGFloat((intValue >> 8) & 0xff) / 255.0
    let blue = CGFloat(intValue & 0xff) / 255.0
    return NSColor(red: red, green: green, blue: blue, alpha: 1.0)
}

guard let source = NSImage(contentsOfFile: inputPath) else {
    fputs("failed to read image: \(inputPath)\n", stderr)
    exit(1)
}

let canvasSize = 1024
guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: canvasSize,
    pixelsHigh: canvasSize,
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

let canvasRect = NSRect(x: 0, y: 0, width: canvasSize, height: canvasSize)
NSColor.white.setFill()
canvasRect.fill()

source.draw(
    in: NSRect(x: 92, y: 154, width: 840, height: 840),
    from: .zero,
    operation: .sourceOver,
    fraction: 1.0
)

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center

let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.20)
shadow.shadowOffset = NSSize(width: 3, height: -3)
shadow.shadowBlurRadius = 1.5

let font = NSFont(name: "HiraginoSans-W6", size: fontSize)
    ?? NSFont.systemFont(ofSize: fontSize, weight: .bold)

let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color(from: hexColor),
    .strokeColor: NSColor.white,
    .strokeWidth: -8.0,
    .paragraphStyle: paragraph,
    .shadow: shadow
]

(text as NSString).draw(
    with: NSRect(x: 0, y: 42, width: canvasSize, height: 150),
    options: [.usesLineFragmentOrigin, .usesFontLeading],
    attributes: attributes
)

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
    fputs("failed to encode png\n", stderr)
    exit(1)
}

do {
    try png.write(to: URL(fileURLWithPath: outputPath))
} catch {
    fputs("failed to write image: \(error)\n", stderr)
    exit(1)
}
