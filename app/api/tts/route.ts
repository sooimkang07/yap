import { NextResponse } from 'next/server'
import { estimateSpeechDurationSeconds, generateFallbackSpeechBuffer } from '@/lib/server/fallbackAudio'
import { hasOpenAIKey, openAIHeaders, parseOpenAIError } from '@/lib/server/openai'

const VOICE_BY_SPEAKER: Record<string, string> = {
  me: 'alloy',
  chloe: 'coral',
  maria: 'sage',
  sarah: 'shimmer',
  lainey: 'nova',
}

const INSTRUCTIONS_BY_SPEAKER: Record<string, string> = {
  me: 'Speak like a casual iPhone voice memo to close friends.',
  chloe: 'Speak warmly, slightly animated, and casually like a close friend reacting in a group chat.',
  maria: 'Speak grounded, friendly, and easygoing like a close friend in a voice memo.',
  sarah: 'Speak bright, amused, and conversational like a close friend reacting in real time.',
  lainey: 'Speak playful, quick, and lightly teasing like a close friend in a group chat.',
}

interface TtsBody {
  speakerId?: string
  text?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as TtsBody
  const speakerId = body.speakerId ?? 'me'
  const text = body.text?.trim()

  if (!text) {
    return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
  }

  if (!hasOpenAIKey()) {
    const buffer = generateFallbackSpeechBuffer(speakerId, text)
    return NextResponse.json({
      audioBase64: buffer.toString('base64'),
      mimeType: 'audio/wav',
      duration: estimateSpeechDurationSeconds(text),
      provider: 'fallback',
    })
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: openAIHeaders('application/json'),
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
      voice: VOICE_BY_SPEAKER[speakerId] ?? 'alloy',
      input: text,
      instructions: INSTRUCTIONS_BY_SPEAKER[speakerId] ?? INSTRUCTIONS_BY_SPEAKER.me,
      response_format: 'wav',
    }),
  })

  if (!response.ok) {
    const error = await parseOpenAIError(response)
    return NextResponse.json({ error }, { status: response.status })
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return NextResponse.json({
    audioBase64: buffer.toString('base64'),
    mimeType: response.headers.get('content-type') ?? 'audio/wav',
    duration: estimateSpeechDurationSeconds(text),
    provider: 'openai',
  })
}
