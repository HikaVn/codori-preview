import AppKit
import Foundation

func usage() -> Never {
    fputs("usage: swift render_line_edge_review.swift <outputDir> [stickerDir]\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 2 || args.count == 3 else { usage() }

let root = FileManager.default.currentDirectoryPath
let outputDir = URL(fileURLWithPath: args[1], isDirectory: true)
let stickerDir = args.count == 3 ? args[2] : "\(root)/assets/line/export/stickers"

let stickerFiles = [
    ("C", "\(stickerDir)/codori_line_01_C_major.png"),
    ("Cm", "\(stickerDir)/codori_line_02_Cm_minor.png"),
    ("C7", "\(stickerDir)/codori_line_03_C7_seventh.png"),
    ("Cadd9", "\(stickerDir)/codori_line_04_Cadd9_add9.png")
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

func write(_ rep: NSBitmapImageRep, to url: URL) throws {
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "CodoriLineEdgeReview", code: 1)
    }
    try data.write(to: url)
}

func image(from path: String) -> NSImage? {
    NSImage(contentsOfFile: path)
}

func drawChecker(in rect: NSRect, cell: CGFloat = 16) {
    let colorA = NSColor(calibratedWhite: 0.86, alpha: 1)
    let colorB = NSColor(calibratedWhite: 0.98, alpha: 1)
    let columns = Int(ceil(rect.width / cell))
    let rows = Int(ceil(rect.height / cell))

    for row in 0..<rows {
        for col in 0..<columns {
            ((row + col).isMultiple(of: 2) ? colorA : colorB).setFill()
            NSRect(
                x: rect.minX + CGFloat(col) * cell,
                y: rect.minY + CGFloat(row) * cell,
                width: cell,
                height: cell
            ).fill()
        }
    }
}

func drawLabel(_ text: String, at point: NSPoint) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .left
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 18, weight: .bold),
        .foregroundColor: NSColor(calibratedWhite: 0.12, alpha: 1),
        .paragraphStyle: paragraph
    ]
    (text as NSString).draw(at: point, withAttributes: attrs)
}

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

let sheet = makeBitmap(width: 1480, height: 640)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheet)
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: 1480, height: 640).fill()

for (index, sticker) in stickerFiles.enumerated() {
    guard let stickerImage = image(from: sticker.1) else {
        fputs("Missing sticker: \(sticker.1)\n", stderr)
        continue
    }

    let x = CGFloat(index * 370)
    let checkerRect = NSRect(x: x, y: 320, width: 370, height: 320)
    drawChecker(in: checkerRect)
    stickerImage.draw(in: checkerRect, from: .zero, operation: .sourceOver, fraction: 1)
    drawLabel("\(sticker.0) checker", at: NSPoint(x: x + 12, y: 604))

    let darkRect = NSRect(x: x, y: 0, width: 370, height: 320)
    NSColor(calibratedRed: 0.10, green: 0.12, blue: 0.15, alpha: 1).setFill()
    darkRect.fill()
    stickerImage.draw(in: darkRect, from: .zero, operation: .sourceOver, fraction: 1)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 18, weight: .bold),
        .foregroundColor: NSColor.white
    ]
    ("\(sticker.0) dark" as NSString).draw(at: NSPoint(x: x + 12, y: 284), withAttributes: attrs)
}

NSGraphicsContext.restoreGraphicsState()
try write(sheet, to: outputDir.appendingPathComponent("codori_line_edge_review_checker_dark_2026-05-22.png"))

if let tab = image(from: "\(stickerDir)/codori_line_tab_96x74.png") {
    let tabSheet = makeBitmap(width: 576, height: 296)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: tabSheet)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: 576, height: 296).fill()

    let actualChecker = NSRect(x: 0, y: 222, width: 96, height: 74)
    drawChecker(in: actualChecker, cell: 8)
    tab.draw(in: actualChecker, from: .zero, operation: .sourceOver, fraction: 1)

    let actualDark = NSRect(x: 96, y: 222, width: 96, height: 74)
    NSColor(calibratedRed: 0.10, green: 0.12, blue: 0.15, alpha: 1).setFill()
    actualDark.fill()
    tab.draw(in: actualDark, from: .zero, operation: .sourceOver, fraction: 1)

    let zoomChecker = NSRect(x: 0, y: 0, width: 384, height: 296)
    drawChecker(in: zoomChecker, cell: 16)
    tab.draw(in: zoomChecker, from: .zero, operation: .sourceOver, fraction: 1)

    let zoomDark = NSRect(x: 384, y: 0, width: 192, height: 148)
    NSColor(calibratedRed: 0.10, green: 0.12, blue: 0.15, alpha: 1).setFill()
    zoomDark.fill()
    tab.draw(in: zoomDark, from: .zero, operation: .sourceOver, fraction: 1)

    NSGraphicsContext.restoreGraphicsState()
    try write(tabSheet, to: outputDir.appendingPathComponent("codori_line_tab_edge_review_2026-05-22.png"))
}

let readme = """
# Codori LINE Edge Review

透過エッジと縮小参考表示の確認用画像です。

## Files

```text
codori_line_edge_review_checker_dark_2026-05-22.png
codori_line_tab_edge_review_2026-05-22.png
```

## Notes

- Checker and dark backgrounds are review backgrounds only.
- 370 x 320 sticker exports are read from `\(stickerDir)`.
- 96 x 74 tab export is read from `\(stickerDir)/codori_line_tab_96x74.png`.
"""

try readme.write(to: outputDir.appendingPathComponent("README.md"), atomically: true, encoding: .utf8)
