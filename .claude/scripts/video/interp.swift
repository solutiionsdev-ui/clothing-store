import AVFoundation
import Foundation

// 24 -> 48 fps by inserting a linear cross-blend between each pair of source
// frames. Output stays all-intra H.264 so every seek remains O(1).
// Each source frame i yields two output frames: frame[i] and blend(frame[i], frame[i+1]).
// The last frame blends with itself, so the total duration is unchanged.
let a = CommandLine.arguments
guard a.count >= 5 else { FileHandle.standardError.write("usage: interp <in> <out> <side> <mbps>\n".data(using:.utf8)!); exit(2) }
let inURL = URL(fileURLWithPath: a[1]), outURL = URL(fileURLWithPath: a[2])
let side = Int(a[3])!, mbps = Double(a[4])!
try? FileManager.default.removeItem(at: outURL)

let asset = AVAsset(url: inURL)
guard let track = asset.tracks(withMediaType: .video).first else { print("no track"); exit(1) }
let srcFps = track.nominalFrameRate > 0 ? Double(track.nominalFrameRate) : 24.0
let outFps = srcFps * 2
let timescale: CMTimeScale = 4800

let reader = try AVAssetReader(asset: asset)
let rout = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: side,
    kCVPixelBufferHeightKey as String: side,
])
rout.alwaysCopiesSampleData = false
reader.add(rout)

let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: side, AVVideoHeightKey: side,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: Int(mbps * 1_000_000),
        AVVideoMaxKeyFrameIntervalKey: 1,
        AVVideoMaxKeyFrameIntervalDurationKey: 0.0,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoAllowFrameReorderingKey: false,
    ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: side,
    kCVPixelBufferHeightKey as String: side,
])
writer.add(input)
writer.startWriting(); writer.startSession(atSourceTime: .zero); reader.startReading()

// Read every source frame into a compact byte array (tight rows, no padding).
var frames: [[UInt8]] = []
var W = 0, H = 0
while let sb = rout.copyNextSampleBuffer() {
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb)
    let stride = CVPixelBufferGetBytesPerRow(pb)
    W = w; H = h
    var buf = [UInt8](repeating: 0, count: w*h*4)
    if let base = CVPixelBufferGetBaseAddress(pb) {
        let src = base.assumingMemoryBound(to: UInt8.self)
        buf.withUnsafeMutableBufferPointer { dst in
            for row in 0..<h { memcpy(dst.baseAddress! + row*w*4, src + row*stride, w*4) }
        }
    }
    CVPixelBufferLockBaseAddress(pb, .readOnly) == kCVReturnSuccess ? () : ()
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    frames.append(buf)
}
print("read \(frames.count) frames at \(W)x\(H), source \(srcFps) fps -> \(outFps) fps")
guard frames.count > 1 else { print("nothing to do"); exit(1) }

@inline(__always)
func blend(_ x: [UInt8], _ y: [UInt8]) -> [UInt8] {
    var o = [UInt8](repeating: 0, count: x.count)
    x.withUnsafeBufferPointer { xp in y.withUnsafeBufferPointer { yp in o.withUnsafeMutableBufferPointer { op in
        let n = x.count
        var i = 0
        while i < n { op[i] = UInt8((UInt16(xp[i]) &+ UInt16(yp[i])) >> 1); i += 1 }
    }}}
    return o
}

func push(_ bytes: [UInt8], _ index: Int) {
    while !input.isReadyForMoreMediaData { usleep(500) }
    guard let pool = adaptor.pixelBufferPool else { return }
    var pbOut: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pbOut)
    guard let pb = pbOut else { return }
    CVPixelBufferLockBaseAddress(pb, [])
    let stride = CVPixelBufferGetBytesPerRow(pb)
    if let base = CVPixelBufferGetBaseAddress(pb) {
        let dst = base.assumingMemoryBound(to: UInt8.self)
        bytes.withUnsafeBufferPointer { sp in
            for row in 0..<H { memcpy(dst + row*stride, sp.baseAddress! + row*W*4, W*4) }
        }
    }
    CVPixelBufferUnlockBaseAddress(pb, [])
    adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(index) * CMTimeValue(Double(timescale)/outFps), timescale: timescale))
}

var outIndex = 0
for i in 0..<frames.count {
    push(frames[i], outIndex); outIndex += 1
    let next = i + 1 < frames.count ? frames[i+1] : frames[i]
    push(blend(frames[i], next), outIndex); outIndex += 1
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
if writer.status == .completed {
    let sz = (try! FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as! NSNumber).doubleValue
    print("OK out frames=\(outIndex) size=\(String(format: "%.2f", sz/1_048_576))MB")
} else { print("FAILED: \(writer.error?.localizedDescription ?? "?")"); exit(1) }
