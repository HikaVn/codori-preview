import AppKit
import Foundation

struct TouchPath {
    let points: [CGPoint]
    let width: CGFloat
}

struct CharacterTouchup {
    let inputName: String
    let outputName: String
    let note: String
    let paths: [TouchPath]
}

func usage() -> Never {
    fputs("usage: swift render_wingtip_touchup_candidate.swift <sourceDir> <outputDir>\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 3 else { usage() }

let sourceDir = URL(fileURLWithPath: args[1], isDirectory: true)
let outputDir = URL(fileURLWithPath: args[2], isDirectory: true)

let touchups = [
    CharacterTouchup(
        inputName: "major.png",
        outputName: "major.png",
        note: "C / Major is the wing-tip reference and is copied unchanged.",
        paths: []
    ),
    CharacterTouchup(
        inputName: "minor.png",
        outputName: "minor.png",
        note: "Only visible front-wing tips receive a small rounded two-lobed split.",
        paths: [
            TouchPath(points: [
                CGPoint(x: 196, y: 388),
                CGPoint(x: 184, y: 397),
                CGPoint(x: 172, y: 399)
            ], width: 4.0),
            TouchPath(points: [
                CGPoint(x: 287, y: 389),
                CGPoint(x: 299, y: 397),
                CGPoint(x: 312, y: 398)
            ], width: 4.0)
        ]
    ),
    CharacterTouchup(
        inputName: "seventh.png",
        outputName: "seventh.png",
        note: "The raised visible wing tip receives the C-style small rounded split.",
        paths: [
            TouchPath(points: [
                CGPoint(x: 445, y: 268),
                CGPoint(x: 434, y: 281),
                CGPoint(x: 417, y: 287)
            ], width: 3.8)
        ]
    ),
    CharacterTouchup(
        inputName: "add9.png",
        outputName: "add9.png",
        note: "Only visible side-wing tips receive the C-style small rounded split.",
        paths: [
            TouchPath(points: [
                CGPoint(x: 88, y: 337),
                CGPoint(x: 106, y: 347),
                CGPoint(x: 128, y: 345)
            ], width: 3.8),
            TouchPath(points: [
                CGPoint(x: 457, y: 379),
                CGPoint(x: 441, y: 389),
                CGPoint(x: 423, y: 387)
            ], width: 3.8)
        ]
    )
]

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

func bitmap(from url: URL) -> NSBitmapImageRep? {
    guard let data = try? Data(contentsOf: url) else { return nil }
    return NSBitmapImageRep(data: data)
}

func image(from rep: NSBitmapImageRep) -> NSImage {
    let image = NSImage(size: NSSize(width: rep.pixelsWide, height: rep.pixelsHigh))
    image.addRepresentation(rep)
    return image
}

func write(_ rep: NSBitmapImageRep, to url: URL) throws {
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "CodoriWingtipTouchup", code: 1)
    }
    try data.write(to: url)
}

func pointFromTopLeft(_ point: CGPoint, imageHeight: Int) -> NSPoint {
    NSPoint(x: point.x, y: CGFloat(imageHeight) - point.y)
}

func drawRoundedSplit(_ path: TouchPath, imageHeight: Int) {
    guard path.points.count >= 2 else { return }

    let bezier = NSBezierPath()
    bezier.lineWidth = path.width
    bezier.lineCapStyle = .round
    bezier.lineJoinStyle = .round
    bezier.move(to: pointFromTopLeft(path.points[0], imageHeight: imageHeight))

    if path.points.count == 3 {
        let start = path.points[0]
        let control = path.points[1]
        let end = path.points[2]
        let control1 = CGPoint(
            x: start.x + (control.x - start.x) * 0.85,
            y: start.y + (control.y - start.y) * 0.85
        )
        let control2 = CGPoint(
            x: end.x + (control.x - end.x) * 0.85,
            y: end.y + (control.y - end.y) * 0.85
        )
        bezier.curve(
            to: pointFromTopLeft(end, imageHeight: imageHeight),
            controlPoint1: pointFromTopLeft(control1, imageHeight: imageHeight),
            controlPoint2: pointFromTopLeft(control2, imageHeight: imageHeight)
        )
    } else {
        for point in path.points.dropFirst() {
            bezier.line(to: pointFromTopLeft(point, imageHeight: imageHeight))
        }
    }

    NSColor(calibratedRed: 0.08, green: 0.06, blue: 0.05, alpha: 0.92).setStroke()
    bezier.stroke()
}

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

var readmeLines = [
    "# Codori 羽先端タッチアップ候補",
    "",
    "元画像を上書きしない、非破壊の候補画像です。",
    "",
    "基準：Cの小さな丸い2山の割れ。",
    ""
]

for touchup in touchups {
    let inputURL = sourceDir.appendingPathComponent(touchup.inputName)
    let outputURL = outputDir.appendingPathComponent(touchup.outputName)
    guard let source = bitmap(from: inputURL) else {
        fputs("Failed to load \(inputURL.path)\n", stderr)
        exit(1)
    }

    let result = makeBitmap(width: source.pixelsWide, height: source.pixelsHigh)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: result)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: source.pixelsWide, height: source.pixelsHigh).fill()
    image(from: source).draw(
        in: NSRect(x: 0, y: 0, width: source.pixelsWide, height: source.pixelsHigh),
        from: .zero,
        operation: .sourceOver,
        fraction: 1.0
    )
    for path in touchup.paths {
        drawRoundedSplit(path, imageHeight: source.pixelsHigh)
    }
    NSGraphicsContext.restoreGraphicsState()

    try write(result, to: outputURL)
    readmeLines.append("- `\(touchup.outputName)`: \(touchup.note)")
}

readmeLines.append("")
readmeLines.append("この候補は、羽先端のみの局所調整です。全体再デザインではありません。")

try readmeLines.joined(separator: "\n")
    .write(to: outputDir.appendingPathComponent("README.md"), atomically: true, encoding: .utf8)

print("Wrote wingtip touchup candidates to \(outputDir.path)")
