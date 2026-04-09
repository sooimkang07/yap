import { generateSpeakerAudio } from '@/lib/audioGen'

interface TtsResponse {
  audioBase64?: string
  mimeType?: string
  duration?: number
}

function estimateSpeechDurationSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1.4, Math.round((words / 2.6) * 10) / 10)
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return new Blob([bytes], { type: mimeType })
}

export async function synthesizeSpeech(speakerId: string, text: string, fallbackDuration?: number) {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakerId, text }),
    })

    if (!response.ok) {
      throw new Error(`TTS request failed with ${response.status}`)
    }

    const json = (await response.json()) as TtsResponse
    if (!json.audioBase64) throw new Error('Missing audio payload')

    const blob = base64ToBlob(json.audioBase64, json.mimeType ?? 'audio/wav')
    return {
      url: URL.createObjectURL(blob),
      duration: json.duration ?? fallbackDuration ?? estimateSpeechDurationSeconds(text),
    }
  } catch {
    const duration = fallbackDuration ?? estimateSpeechDurationSeconds(text)
    const url = await generateSpeakerAudio(speakerId, duration)
    return { url, duration }
  }
}
