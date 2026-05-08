import AVFoundation
import Combine
import Foundation

final class RecordingService: NSObject, ObservableObject {
    @Published private(set) var isRecording = false
    private var recorder: AVAudioRecorder?

    func requestPermission() async -> Bool {
        let granted = await AVAudioApplication.requestRecordPermission()
        return granted
    }

    func startRecording(to url: URL) throws {
        let status = AVAudioSession.sharedInstance().recordPermission
        guard status == .granted else {
            throw RecordingError.microphonePermissionDenied
        }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)

        recorder = try AVAudioRecorder(
            url: url,
            settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
        )

        recorder?.record()
        isRecording = true
    }

    func stopRecording() {
        recorder?.stop()
        isRecording = false
    }
}

enum RecordingError: LocalizedError {
    case microphonePermissionDenied

    var errorDescription: String? {
        switch self {
        case .microphonePermissionDenied:
            return "Microphone permission denied. Please allow microphone access and try again."
        }
    }
}
