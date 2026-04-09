const SPEAKER_FREQUENCIES: Record<string, number> = {
  me: 175,
  chloe: 262,
  maria: 220,
  sarah: 240,
  lainey: 205,
}

function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const length = samples.length
  const buffer = Buffer.alloc(44 + length * 2)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(length * 2, 40)

  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(sample * 0x7fff), 44 + i * 2)
  }

  return buffer
}

export function estimateSpeechDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1.4, Math.round((words / 2.6) * 10) / 10)
}

export function generateFallbackSpeechBuffer(speakerId: string, text: string): Buffer {
  const durationSeconds = estimateSpeechDurationSeconds(text)
  const sampleRate = 24000
  const totalSamples = Math.ceil(sampleRate * durationSeconds)
  const samples = new Float32Array(totalSamples)
  const baseFrequency = SPEAKER_FREQUENCIES[speakerId] ?? 210
  const syllableRate = 4 + (baseFrequency % 30) / 30
  const envelopePeriod = sampleRate / syllableRate

  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate
    const cycle = (i % envelopePeriod) / envelopePeriod
    const envelope = cycle < 0.18 ? cycle / 0.18 : Math.max(0, 1 - (cycle - 0.18) / 0.82)
    const vibrato = 1 + 0.03 * Math.sin(2 * Math.PI * 5 * time)
    const phase = 2 * Math.PI * baseFrequency * vibrato * time
    const tone =
      Math.sin(phase) * 0.5 +
      Math.sin(phase * 2) * 0.22 +
      Math.sin(phase * 3) * 0.12

    samples[i] = tone * envelope * 0.22
  }

  return encodeWav(samples, sampleRate)
}
