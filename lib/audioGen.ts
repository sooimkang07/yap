// ── Synthetic Audio Generator ─────────────────────────────────────────────────
// Client-side only. Uses OfflineAudioContext to render speech-like audio per
// speaker profile, then encodes to WAV and returns an object URL.
//
// Each speaker has a distinct fundamental frequency and syllable rhythm so
// voices sound different from one another in the conversation player.
//
// To replace: swap generateSpeakerAudio() with a real TTS provider call.
// Contract is: (speakerId, durationSeconds) → Promise<objectUrl>

import { getParticipant } from './participants'

// ── WAV encoder ───────────────────────────────────────────────────────────────

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const n = samples.length
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)

  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i))
  }

  str(0, 'RIFF');  v.setUint32(4,  36 + n * 2,       true)
  str(8, 'WAVE');  str(12, 'fmt '); v.setUint32(16, 16, true)
  v.setUint16(20, 1,           true) // PCM
  v.setUint16(22, 1,           true) // mono
  v.setUint32(24, sampleRate,  true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2,           true) // block align
  v.setUint16(34, 16,          true) // 16-bit
  str(36, 'data'); v.setUint32(40, n * 2, true)

  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true)
  }
  return buf
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateSpeakerAudio(
  speakerId: string,
  durationSeconds: number
): Promise<string> {
  const p = getParticipant(speakerId).voiceProfile
  const dur = Math.max(durationSeconds, 0.5)
  const sampleRate = 22050
  const numSamples = Math.ceil(sampleRate * dur)

  const ctx = new OfflineAudioContext(1, numSamples, sampleRate)

  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  // Sawtooth gives a richer, voice-like harmonic series
  osc.type = 'sawtooth'

  // Build syllable-rhythm amplitude envelope
  const period = 1 / p.syllableRate
  gainNode.gain.setValueAtTime(0, 0)

  for (let t = 0; t < dur; t += period) {
    const periodEnd = Math.min(t + period, dur)
    gainNode.gain.linearRampToValueAtTime(p.gainPeak,          t + period * 0.12)
    gainNode.gain.setValueAtTime(         p.gainPeak * 0.72,   t + period * 0.40)
    gainNode.gain.linearRampToValueAtTime(0,                   periodEnd - 0.01)
  }

  // Pitch variation — simulate natural intonation contour
  const variance = p.baseFreq * 0.13
  osc.frequency.setValueAtTime(p.baseFreq, 0)
  for (let t = 0; t < dur; t += period * 1.8) {
    const delta = (Math.random() - 0.5) * variance
    osc.frequency.linearRampToValueAtTime(p.baseFreq + delta, t + period * 0.9)
    osc.frequency.linearRampToValueAtTime(p.baseFreq,         t + period * 1.8)
  }

  osc.start(0)
  osc.stop(dur)

  const buffer = await ctx.startRendering()
  const wav = encodeWAV(buffer.getChannelData(0), sampleRate)
  const blob = new Blob([wav], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

// ── Batch helper ──────────────────────────────────────────────────────────────
// Generate audio for multiple (speakerId, duration) pairs in parallel.

export async function generateBatch(
  items: Array<{ id: string; speakerId: string; duration: number }>
): Promise<Record<string, string>> {
  const results = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      url: await generateSpeakerAudio(item.speakerId, item.duration),
    }))
  )
  return Object.fromEntries(results.map((r) => [r.id, r.url]))
}
