import { NextResponse } from 'next/server'
import { hasOpenAIKey, openAIHeaders, parseOpenAIError } from '@/lib/server/openai'

const STUB_TRANSCRIPTS = [
  "Omg yes the pics were so good. I'm gonna need everyone to approve before I post anything though. Also Chloe I cannot believe that patient story, like only you could pull that off.",
  "Wait we should plan the next dinner soon. I was thinking that new place on Mulberry. Also someone remind me to send those pics I took on my phone.",
  "Chloe that story is sending me. Like did he just fully think you were his actual mom the whole time. Also the album pics are everything, Maria you did that.",
  "I'm still thinking about last night honestly it was so fun. Also I need to do the insta dump tonight before I lose motivation. Everyone pick your favorites.",
]

let stubIndex = 0

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 })
  }

  if (!hasOpenAIKey()) {
    const text = STUB_TRANSCRIPTS[stubIndex % STUB_TRANSCRIPTS.length]
    stubIndex += 1
    return NextResponse.json({ text, provider: 'stub' })
  }

  const upstream = new FormData()
  upstream.append('file', file, file.name || 'recording.webm')
  upstream.append('model', process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-mini-transcribe')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: openAIHeaders(),
    body: upstream,
  })

  if (!response.ok) {
    const error = await parseOpenAIError(response)
    return NextResponse.json({ error }, { status: response.status })
  }

  const json = (await response.json()) as { text?: string }
  return NextResponse.json({ text: json.text ?? '', provider: 'openai' })
}
