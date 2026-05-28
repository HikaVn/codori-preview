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

struct Component {
    var minX: Int
    var minY: Int
    var maxX: Int
    var maxY: Int
    var count: Int
}

func bitmap(from path: String) -> NSBitmapImageRep? {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)) else { return nil }
    return NSBitmapImageRep(data: data)
}

func rgba(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> (red: Int, green: Int, blue: Int, alpha: Int) {
    let data = rep.bitmapData!
    let offset = y * rep.bytesPerRow + x * 4
    return (Int(data[offset]), Int(data[offset + 1]), Int(data[offset + 2]), Int(data[offset + 3]))
}

func isDarkEyePixel(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> Bool {
    let pixel = rgba(rep, x, y)
    guard pixel.alpha > 80 else { return false }
    return max(pixel.red, pixel.green, pixel.blue) < 95
}

func visibleBoundingBox(_ rep: NSBitmapImageRep) -> (minX: Int, minY: Int, maxX: Int, maxY: Int) {
    var minX = rep.pixelsWide
    var minY = rep.pixelsHigh
    var maxX = 0
    var maxY = 0

    for y in 0..<rep.pixelsHigh {
        for x in 0..<rep.pixelsWide where rgba(rep, x, y).alpha > 5 {
            minX = min(minX, x)
            minY = min(minY, y)
            maxX = max(maxX, x)
            maxY = max(maxY, y)
        }
    }

    return (minX, minY, maxX, maxY)
}

func faceDarkComponents(_ rep: NSBitmapImageRep, bbox: (minX: Int, minY: Int, maxX: Int, maxY: Int)) -> [Component] {
    let imageWidth = rep.pixelsWide
    var visited = Array(repeating: false, count: rep.pixelsWide * rep.pixelsHigh)
    func index(_ x: Int, _ y: Int) -> Int { y * imageWidth + x }

    let visibleWidth = bbox.maxX - bbox.minX + 1
    let visibleHeight = bbox.maxY - bbox.minY + 1

    let roiMinX = bbox.minX + Int(Double(visibleWidth) * 0.10)
    let roiMaxX = bbox.minX + Int(Double(visibleWidth) * 0.84)
    let roiMinY = bbox.minY + Int(Double(visibleHeight) * 0.16)
    let roiMaxY = bbox.minY + Int(Double(visibleHeight) * 0.64)

    var components: [Component] = []

    for y in roiMinY...roiMaxY {
        for x in roiMinX...roiMaxX {
            if visited[index(x, y)] || !isDarkEyePixel(rep, x, y) { continue }

            var queue = [(x, y)]
            var head = 0
            visited[index(x, y)] = true
            var component = Component(minX: x, minY: y, maxX: x, maxY: y, count: 0)

            while head < queue.count {
                let (currentX, currentY) = queue[head]
                head += 1

                component.minX = min(component.minX, currentX)
                component.minY = min(component.minY, currentY)
                component.maxX = max(component.maxX, currentX)
                component.maxY = max(component.maxY, currentY)
                component.count += 1

                for nextY in max(roiMinY, currentY - 1)...min(roiMaxY, currentY + 1) {
                    for nextX in max(roiMinX, currentX - 1)...min(roiMaxX, currentX + 1) {
                        if visited[index(nextX, nextY)] || !isDarkEyePixel(rep, nextX, nextY) { continue }
                        visited[index(nextX, nextY)] = true
                        queue.append((nextX, nextY))
                    }
                }
            }

            let componentWidth = component.maxX - component.minX + 1
            let componentHeight = component.maxY - component.minY + 1
            let aspect = Double(componentWidth) / Double(componentHeight)

            if component.count > 80 &&
                componentWidth >= 8 &&
                componentHeight >= 8 &&
                componentWidth <= 85 &&
                componentHeight <= 85 &&
                aspect > 0.45 &&
                aspect < 1.8 {
                components.append(component)
            }
        }
    }

    return components
}

func stickerScale(code: String, bbox: (minX: Int, minY: Int, maxX: Int, maxY: Int)) -> Double {
    let width = bbox.maxX - bbox.minX + 1
    let height = bbox.maxY - bbox.minY + 1
    let isLongCode = code.count >= 5
    let maxCharacterWidth = isLongCode ? 226.0 : 250.0
    let maxCharacterHeight = isLongCode ? 216.0 : 224.0
    return min(maxCharacterWidth / Double(width), maxCharacterHeight / Double(height))
}

var rows: [(code: String, area: Double, leftRaw: Int, rightRaw: Int)] = []

for metric in metrics {
    guard let rep = bitmap(from: metric.path) else {
        fputs("Missing image: \(metric.path)\n", stderr)
        exit(1)
    }

    let bbox = visibleBoundingBox(rep)
    let topFaceComponents = Array(faceDarkComponents(rep, bbox: bbox)
        .sorted { $0.count > $1.count }
        .prefix(3))
        .sorted { ($0.minX + $0.maxX) < ($1.minX + $1.maxX) }

    guard let leftEye = topFaceComponents.first, let rightEye = topFaceComponents.last, topFaceComponents.count >= 3 else {
        fputs("Could not detect eyes for \(metric.code)\n", stderr)
        exit(1)
    }

    let scale = stickerScale(code: metric.code, bbox: bbox)
    let scaledAverageEyeArea = Double(leftEye.count + rightEye.count) / 2.0 * scale * scale
    rows.append((metric.code, scaledAverageEyeArea, leftEye.count, rightEye.count))
}

guard let baseArea = rows.first?.area else {
    fputs("No rows to compare.\n", stderr)
    exit(1)
}

var hasFailure = false
print("Codori eye size check")
print("Target: C average eye area, allowed range: +/-10%")

for row in rows {
    let diff = (row.area / baseArea - 1.0) * 100.0
    let status = abs(diff) <= 10.0 ? "OK" : "NG"
    if status == "NG" { hasFailure = true }
    print(String(format: "%@ avgScaledEye=%.1f raw=(%d,%d) vs_C=%+.1f%% %@", row.code, row.area, row.leftRaw, row.rightRaw, diff, status))
}

if hasFailure {
    exit(1)
}
