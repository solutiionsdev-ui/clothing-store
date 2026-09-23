import AVFoundation
import Foundation

// All-intra H.264 re-encoder: every frame becomes a keyframe so that
// `video.currentTime = x` seeks in O(1) instead of decoding from frame 0.
let args = CommandLine.arguments
guard args.count >= 5 else {
    FileHandle.standardError.write("usage: reencode <in> <out> <side> <bitrateMbps>\n".data(using: .utf8)!)
    exit(2)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let side = Int(args[3])!
let mbps = Double(args[4])!

try? FileManager.default.removeItem(at: outURL)

let asset = AVAsset(url: inURL)
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }

let reader = try AVAssetReader(asset: asset)
let readerOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
])
readerOutput.alwaysCopiesSampleData = false
reader.add(readerOutput)

let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: side,
    AVVideoHeightKey: side,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: Int(mbps * 1_000_000),
        // Every frame an IDR — this is the whole point.
        AVVideoMaxKeyFrameIntervalKey: 1,
        AVVideoMaxKeyFrameIntervalDurationKey: 0.0,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoAllowFrameReorderingKey: false,
    ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
input.transform = track.preferredTransform
writer.add(input)

writer.startWriting()
writer.startSession(atSourceTime: .zero)
reader.startReading()

let queue = DispatchQueue(label: "encode")
let done = DispatchSemaphore(value: 0)
var count = 0
input.requestMediaDataWhenReady(on: queue) {
    while input.isReadyForMoreMediaData {
        guard let sample = readerOutput.copyNextSampleBuffer() else {
            input.markAsFinished()
            writer.finishWriting { done.signal() }
            return
        }
        input.append(sample)
        count += 1
    }
}
done.wait()
if writer.status == .completed {
    let size = (try! FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as! NSNumber).doubleValue
    print("OK frames=\(count) size=\(String(format: "%.2f", size/1_048_576))MB")
} else {
    print("FAILED: \(writer.error?.localizedDescription ?? "unknown")")
    exit(1)
}
