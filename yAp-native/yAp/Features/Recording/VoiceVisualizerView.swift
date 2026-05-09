import SwiftUI
import AVFoundation
import Combine

struct VoiceVisualizerView: View {
    @StateObject private var audioMonitor: AudioLevelMonitor
    let isRecording: Bool

    init(isRecording: Bool) {
        self.isRecording = isRecording
        _audioMonitor = StateObject(wrappedValue: AudioLevelMonitor())
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .bottom, spacing: 3) {
                ForEach(0..<20, id: \.self) { index in
                    let level = audioMonitor.normalizedLevels.indices.contains(index)
                        ? audioMonitor.normalizedLevels[index]
                        : 0.0

                    VStack(spacing: 0) {
                        Spacer()

                        RoundedRectangle(cornerRadius: 2)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        YapTheme.ColorToken.colorMaria,
                                        YapTheme.ColorToken.waveActive,
                                    ]),
                                    startPoint: .bottom,
                                    endPoint: .top
                                )
                            )
                            .frame(height: CGFloat(level) * 60)
                            .animation(.easeInOut(duration: 0.1), value: level)
                    }
                }
            }
            .frame(height: 80)
            .padding(YapTheme.Spacing.large)
            .background(YapTheme.ColorToken.surface.opacity(0.5))
            .cornerRadius(YapTheme.Radius.lg)
        }
        .onAppear {
            if isRecording {
                audioMonitor.startMonitoring()
            }
        }
        .onDisappear {
            audioMonitor.stopMonitoring()
        }
    }
}

class AudioLevelMonitor: NSObject, ObservableObject {
    @Published var normalizedLevels: [Double] = Array(repeating: 0.0, count: 20)

    private var audioEngine: AVAudioEngine?
    let objectWillChange = PassthroughSubject<Void, Never>()

    func startMonitoring() {
        let audioEngine = AVAudioEngine()
        self.audioEngine = audioEngine

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        guard format != nil else { return }

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
            DispatchQueue.main.async {
                self?.updateLevels(buffer: buffer)
            }
        }

        do {
            try audioEngine.start()
        } catch {
            print("Error starting audio engine: \(error)")
        }
    }

    func stopMonitoring() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        do {
            try audioEngine?.stop()
        } catch {
            print("Error stopping audio engine: \(error)")
        }
        DispatchQueue.main.async {
            self.normalizedLevels = Array(repeating: 0.0, count: 20)
        }
    }

    private func updateLevels(buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }

        let channelDataPointer = channelData[0]
        let channelDataValueArray = Array(UnsafeBufferPointer(start: channelDataPointer, count: Int(buffer.frameLength)))

        let rms = sqrt(channelDataValueArray.map { $0 * $0 }.reduce(0, +) / Float(channelDataValueArray.count))
        let normalizedLevel = min(Double(rms) * 100, 1.0)

        DispatchQueue.main.async {
            self.normalizedLevels.removeFirst()
            self.normalizedLevels.append(normalizedLevel)
            self.objectWillChange.send()
        }
    }
}

#Preview {
    VStack(spacing: YapTheme.Spacing.large) {
        Text("Voice Visualizer")
            .font(.system(size: 17, weight: .semibold))

        VoiceVisualizerView(isRecording: true)

        Spacer()
    }
    .padding(YapTheme.Spacing.large)
    .background(YapScreenBackground())
}
