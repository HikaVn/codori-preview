import AppKit
import Foundation

func usage() -> Never {
    fputs("usage: swift render_image_grid_review.swift <input.png> <output.png> [step]\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 3 || args.count == 4 else { usage() }

let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let step = args.count == 4 ? Int(args[3]) ?? 50 : 50

guard let image = NSImage(contentsOf: input) else {
    fputs("Failed to load \(input.path)\n", stderr)
    exit(1)
}

let width = Int(image.size.width)
let height = Int(image.size.height)
let rep = NSBitmapImageRep(
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

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor(calibratedWhite: 0.12, alpha: 1.0).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
image.draw(in: NSRect(x: 0, y: 0, width: width, height: height), from: .zero, operation: .sourceOver, fraction: 1.0)

let majorAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.monospacedSystemFont(ofSize: 14, weight: .bold),
    .foregroundColor: NSColor.systemRed
]
let minorAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.monospacedSystemFont(ofSize: 10, weight: .regular),
    .foregroundColor: NSColor.systemBlue
]

for x in stride(from: 0, through: width, by: 10) {
    let isMajor = x % step == 0
    NSColor(calibratedRed: isMajor ? 1 : 0.2, green: isMajor ? 0.1 : 0.45, blue: isMajor ? 0.1 : 1, alpha: isMajor ? 0.7 : 0.35).setStroke()
    let path = NSBezierPath()
    path.lineWidth = isMajor ? 1.2 : 0.5
    path.move(to: NSPoint(x: x, y: 0))
    path.line(to: NSPoint(x: x, y: height))
    path.stroke()
    if isMajor {
        ("x\(x)" as NSString).draw(at: NSPoint(x: x + 2, y: height - 18), withAttributes: majorAttrs)
    }
}

for yTop in stride(from: 0, through: height, by: 10) {
    let y = height - yTop
    let isMajor = yTop % step == 0
    NSColor(calibratedRed: isMajor ? 1 : 0.2, green: isMajor ? 0.1 : 0.45, blue: isMajor ? 0.1 : 1, alpha: isMajor ? 0.7 : 0.35).setStroke()
    let path = NSBezierPath()
    path.lineWidth = isMajor ? 1.2 : 0.5
    path.move(to: NSPoint(x: 0, y: y))
    path.line(to: NSPoint(x: width, y: y))
    path.stroke()
    if isMajor {
        ("y\(yTop)" as NSString).draw(at: NSPoint(x: 4, y: y - 16), withAttributes: isMajor ? majorAttrs : minorAttrs)
    }
}

NSGraphicsContext.restoreGraphicsState()

guard let data = rep.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode \(output.path)\n", stderr)
    exit(1)
}
try data.write(to: output)
