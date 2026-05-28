import AppKit
import Foundation

struct CharacterSpec {
    let family: String
    let outputName: String
}

func usage() -> Never {
    fputs("usage: swift extract_formal_starter_birds.swift <lineup.png> <charactersDir> <checksDir>\n", stderr)
    exit(2)
}

let args = CommandLine.arguments
guard args.count == 4 else { usage() }

let lineupPath = args[1]
let charactersDir = URL(fileURLWithPath: args[2], isDirectory: true)
let checksDir = URL(fileURLWithPath: args[3], isDirectory: true)

let specs = [
    CharacterSpec(family: "major", outputName: "major_formal_candidate_001.png"),
    CharacterSpec(family: "minor", outputName: "minor_formal_candidate_001.png"),
    CharacterSpec(family: "seventh", outputName: "seventh_formal_candidate_001.png"),
    CharacterSpec(family: "add9", outputName: "add9_formal_candidate_001.png")
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
        throw NSError(domain: "CodoriFormalExtract", code: 1)
    }
    try data.write(to: url)
}

func bitmap(from path: String) -> NSBitmapImageRep? {
    guard let image = NSImage(contentsOfFile: path) else { return nil }
    let width = Int(image.size.width)
    let height = Int(image.size.height)
    let rep = makeBitmap(width: width, height: height)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    image.draw(in: NSRect(x: 0, y: 0, width: width, height: height), from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func pixelOffset(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> Int {
    y * rep.bytesPerRow + x * 4
}

func pixel(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> (UInt8, UInt8, UInt8, UInt8) {
    let data = rep.bitmapData!
    let offset = pixelOffset(rep, x, y)
    return (data[offset], data[offset + 1], data[offset + 2], data[offset + 3])
}

func setPixel(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int, _ red: UInt8, _ green: UInt8, _ blue: UInt8, _ alpha: UInt8) {
    let data = rep.bitmapData!
    let offset = pixelOffset(rep, x, y)
    data[offset] = red
    data[offset + 1] = green
    data[offset + 2] = blue
    data[offset + 3] = alpha
}

func isBackgroundCandidate(red: UInt8, green: UInt8, blue: UInt8) -> Bool {
    let red = Int(red)
    let green = Int(green)
    let blue = Int(blue)
    let minValue = min(red, green, blue)
    let maxValue = max(red, green, blue)
    return minValue >= 236 && (maxValue - minValue) <= 18
}

func isInkCandidate(red: UInt8, green: UInt8, blue: UInt8) -> Bool {
    let red = Int(red)
    let green = Int(green)
    let blue = Int(blue)
    let minValue = min(red, green, blue)
    let maxValue = max(red, green, blue)
    return minValue < 238 || (maxValue - minValue) > 18
}

func crop(_ source: NSBitmapImageRep, rect: NSRect) -> NSBitmapImageRep {
    let width = Int(rect.width)
    let height = Int(rect.height)
    let result = makeBitmap(width: width, height: height)
    let x0 = Int(rect.minX)
    let y0 = Int(rect.minY)

    for y in 0..<height {
        for x in 0..<width {
            let sourcePixel = pixel(source, x0 + x, y0 + y)
            setPixel(result, x, y, sourcePixel.0, sourcePixel.1, sourcePixel.2, sourcePixel.3)
        }
    }
    return result
}

func removeBorderWhiteBackground(_ source: NSBitmapImageRep) -> NSBitmapImageRep {
    let width = source.pixelsWide
    let height = source.pixelsHigh
    let result = makeBitmap(width: width, height: height)
    var visited = Array(repeating: false, count: width * height)
    var queue: [(Int, Int)] = []

    func index(_ x: Int, _ y: Int) -> Int { y * width + x }
    func enqueueIfBackground(_ x: Int, _ y: Int) {
        guard x >= 0, y >= 0, x < width, y < height else { return }
        let i = index(x, y)
        let value = pixel(source, x, y)
        guard !visited[i], isBackgroundCandidate(red: value.0, green: value.1, blue: value.2) else { return }
        visited[i] = true
        queue.append((x, y))
    }

    for x in 0..<width {
        enqueueIfBackground(x, 0)
        enqueueIfBackground(x, height - 1)
    }
    for y in 0..<height {
        enqueueIfBackground(0, y)
        enqueueIfBackground(width - 1, y)
    }

    var head = 0
    while head < queue.count {
        let (x, y) = queue[head]
        head += 1
        enqueueIfBackground(x + 1, y)
        enqueueIfBackground(x - 1, y)
        enqueueIfBackground(x, y + 1)
        enqueueIfBackground(x, y - 1)
    }

    for y in 0..<height {
        for x in 0..<width {
            let sourcePixel = pixel(source, x, y)
            if visited[index(x, y)] {
                setPixel(result, x, y, 0, 0, 0, 0)
            } else {
                setPixel(result, x, y, sourcePixel.0, sourcePixel.1, sourcePixel.2, sourcePixel.3)
            }
        }
    }
    return result
}

func bboxForInk(in source: NSBitmapImageRep, region: NSRange) -> NSRect {
    var minX = source.pixelsWide
    var minY = source.pixelsHigh
    var maxX = 0
    var maxY = 0
    var found = false

    let xStart = max(0, region.location)
    let xEnd = min(source.pixelsWide, region.location + region.length)
    for y in 0..<source.pixelsHigh {
        for x in xStart..<xEnd {
            let value = pixel(source, x, y)
            guard isInkCandidate(red: value.0, green: value.1, blue: value.2) else { continue }
            found = true
            minX = min(minX, x)
            minY = min(minY, y)
            maxX = max(maxX, x)
            maxY = max(maxY, y)
        }
    }

    if !found {
        return NSRect(x: xStart, y: 0, width: xEnd - xStart, height: source.pixelsHigh)
    }
    return NSRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

func expanded(_ rect: NSRect, by padding: CGFloat, within source: NSBitmapImageRep) -> NSRect {
    let x = max(0, Int(floor(rect.minX - padding)))
    let y = max(0, Int(floor(rect.minY - padding)))
    let maxX = min(source.pixelsWide, Int(ceil(rect.maxX + padding)))
    let maxY = min(source.pixelsHigh, Int(ceil(rect.maxY + padding)))
    return NSRect(x: x, y: y, width: maxX - x, height: maxY - y)
}

func image(from rep: NSBitmapImageRep) -> NSImage {
    let image = NSImage(size: NSSize(width: rep.pixelsWide, height: rep.pixelsHigh))
    image.addRepresentation(rep)
    return image
}

func renderCheck(character reps: [(CharacterSpec, NSBitmapImageRep)], side: Int, columns: Int) -> NSBitmapImageRep {
    let rows = Int(ceil(Double(reps.count) / Double(columns)))
    let result = makeBitmap(width: side * columns, height: side * rows)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: result)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: result.pixelsWide, height: result.pixelsHigh).fill()

    for (index, pair) in reps.enumerated() {
        let col = index % columns
        let row = index / columns
        let image = image(from: pair.1)
        let scale = min(CGFloat(side - 8) / CGFloat(pair.1.pixelsWide), CGFloat(side - 8) / CGFloat(pair.1.pixelsHigh))
        let drawW = CGFloat(pair.1.pixelsWide) * scale
        let drawH = CGFloat(pair.1.pixelsHigh) * scale
        let x = CGFloat(col * side) + (CGFloat(side) - drawW) / 2
        let y = CGFloat((rows - 1 - row) * side) + (CGFloat(side) - drawH) / 2
        image.draw(in: NSRect(x: x, y: y, width: drawW, height: drawH), from: .zero, operation: .sourceOver, fraction: 1.0)
    }

    NSGraphicsContext.restoreGraphicsState()
    return result
}

try FileManager.default.createDirectory(at: charactersDir, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: checksDir, withIntermediateDirectories: true)

guard let source = bitmap(from: lineupPath) else {
    fputs("Failed to load \(lineupPath)\n", stderr)
    exit(1)
}

var outputs: [(CharacterSpec, NSBitmapImageRep)] = []
let quarter = source.pixelsWide / specs.count

for (index, spec) in specs.enumerated() {
    let overlap = 0
    let start = max(0, index * quarter - overlap)
    let end = index == specs.count - 1
        ? source.pixelsWide
        : min(source.pixelsWide, (index + 1) * quarter + overlap)
    let rawBox = bboxForInk(in: source, region: NSRange(location: start, length: end - start))
    let padded = expanded(rawBox, by: 54, within: source)
    let cropped = crop(source, rect: padded)
    let transparent = removeBorderWhiteBackground(cropped)
    try write(transparent, to: charactersDir.appendingPathComponent(spec.outputName))
    outputs.append((spec, transparent))
}

for side in [96, 64, 48, 32] {
    let check = renderCheck(character: outputs, side: side, columns: 4)
    try write(check, to: checksDir.appendingPathComponent("initial_four_formal_candidate_001_\(side)px.png"))
}

let readme = """
# Codori Formal Starter Birds Candidate 001

Extracted from:

```text
\(lineupPath)
```

## character candidates

- `major_formal_candidate_001.png`
- `minor_formal_candidate_001.png`
- `seventh_formal_candidate_001.png`
- `add9_formal_candidate_001.png`

## checks

- `initial_four_formal_candidate_001_96px.png`
- `initial_four_formal_candidate_001_64px.png`
- `initial_four_formal_candidate_001_48px.png`
- `initial_four_formal_candidate_001_32px.png`

These are formal candidates, not approved final replacements.
Do not overwrite `assets/approved/characters/` until user approval.
"""

try readme.write(to: charactersDir.appendingPathComponent("README.md"), atomically: true, encoding: .utf8)
