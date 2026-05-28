import AppKit
import Foundation

struct CharacterMetric {
    let code: String
    let path: String
}

let root = FileManager.default.currentDirectoryPath
let transparentDir = CommandLine.arguments.count >= 2
    ? CommandLine.arguments[1]
    : "\(root)/assets/line/source/transparent"
let metrics = [
    CharacterMetric(code: "C", path: "\(transparentDir)/codori_character_01_C_major_transparent.png"),
    CharacterMetric(code: "Cm", path: "\(transparentDir)/codori_character_02_Cm_minor_transparent.png"),
    CharacterMetric(code: "C7", path: "\(transparentDir)/codori_character_03_C7_seventh_transparent.png"),
    CharacterMetric(code: "Cadd9", path: "\(transparentDir)/codori_character_04_Cadd9_add9_transparent.png")
]

func bitmap(from path: String) -> NSBitmapImageRep? {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)) else { return nil }
    return NSBitmapImageRep(data: data)
}

func alpha(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> UInt8 {
    rep.bitmapData![y * rep.bytesPerRow + x * 4 + 3]
}

func visibleMetrics(_ rep: NSBitmapImageRep) -> (width: Int, height: Int, alphaPixels: Int) {
    var minX = rep.pixelsWide
    var minY = rep.pixelsHigh
    var maxX = 0
    var maxY = 0
    var alphaPixels = 0

    for y in 0..<rep.pixelsHigh {
        for x in 0..<rep.pixelsWide {
            guard alpha(rep, x, y) > 5 else { continue }
            minX = min(minX, x)
            minY = min(minY, y)
            maxX = max(maxX, x)
            maxY = max(maxY, y)
            alphaPixels += 1
        }
    }

    return (maxX - minX + 1, maxY - minY + 1, alphaPixels)
}

func stickerScale(code: String, width: Int, height: Int) -> Double {
    let isLongCode = code.count >= 5
    let maxCharacterWidth = isLongCode ? 226.0 : 250.0
    let maxCharacterHeight = isLongCode ? 216.0 : 224.0
    return min(maxCharacterWidth / Double(width), maxCharacterHeight / Double(height))
}

var rows: [(code: String, width: Int, height: Int, scale: Double, area: Double)] = []

for metric in metrics {
    guard let rep = bitmap(from: metric.path) else {
        fputs("Missing image: \(metric.path)\n", stderr)
        exit(1)
    }
    let visible = visibleMetrics(rep)
    let scale = stickerScale(code: metric.code, width: visible.width, height: visible.height)
    let scaledArea = Double(visible.alphaPixels) * scale * scale
    rows.append((metric.code, visible.width, visible.height, scale, scaledArea))
}

guard let base = rows.first?.area else {
    fputs("No rows to compare.\n", stderr)
    exit(1)
}

var hasFailure = false
print("Codori LINE bird area check")
print("Target: C bird area, allowed range: +/-10%")

for row in rows {
    let diff = (row.area / base - 1.0) * 100.0
    let status = abs(diff) <= 10.0 ? "OK" : "NG"
    if status == "NG" { hasFailure = true }
    print(String(format: "%@ bbox=%dx%d scale=%.4f area=%.1f vs_C=%+.1f%% %@", row.code, row.width, row.height, row.scale, row.area, diff, status))
}

if hasFailure {
    exit(1)
}
