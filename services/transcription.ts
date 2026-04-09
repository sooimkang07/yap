// ── Transcription Service ────────────────────────────────────────────────────
//
// Two-step contract:
//   1. transcribeBlob(blob)        → raw ASR string  (swap provider here)
//   2. cleanTranscript(raw)        → normalized string for segmentation
//
// To connect a real provider, replace the body of transcribeBlob() only.
// cleanTranscript() is provider-agnostic and stays here.

// ── Stub transcripts (rotate on each call) ───────────────────────────────────

// ── Stub transcripts (rotate on each call) ───────────────────────────────────
// These represent things the user might say into the besties💛 group chat.

const STUB_TRANSCRIPTS = [
  "Omg yes the pics were so good. I'm gonna need everyone to approve before I post anything though. Also Chloe I cannot believe that patient story, like only you could pull that off.",
  "Wait we should plan the next dinner soon. I was thinking that new place on Mulberry. Also someone remind me to send those pics I took on my phone.",
  "Chloe that story is sending me. Like did he just fully think you were his actual mom the whole time. Also the album pics are everything, Maria you did that.",
  "I'm still thinking about last night honestly it was so fun. Also I need to do the insta dump tonight before I lose motivation. Everyone pick your favorites.",
]

let stubIndex = 0

export async function transcribeBlob(_blob: Blob): Promise<string> {
  // TODO: swap body with real provider, e.g.:
  //
  //   const form = new FormData()
  //   form.append('file', blob, 'audio.webm')
  //   form.append('model', 'whisper-1')
  //   const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}` },
  //     body: form,
  //   })
  //   const json = await res.json()
  //   return json.text

  await new Promise((r) => setTimeout(r, 1400))
  const text = STUB_TRANSCRIPTS[stubIndex % STUB_TRANSCRIPTS.length]
  stubIndex++
  return text
}

// ── Transcript normalization ──────────────────────────────────────────────────
// Runs after raw ASR, before segmentation.
// Fixes common ASR artifacts: missing punctuation, run-on sentences, etc.

export function cleanTranscript(raw: string): string {
  let t = raw.trim()

  // Collapse multiple spaces / newlines
  t = t.replace(/\s+/g, ' ')

  // Ensure space after sentence-ending punctuation
  t = t.replace(/([.!?])(\S)/g, '$1 $2')

  // Capitalize after sentence-ending punctuation + space
  t = t.replace(/([.!?])\s+([a-z])/g, (_, p, c) => `${p} ${c.toUpperCase()}`)

  // Capitalize first character
  t = t.replace(/^[a-z]/, (c) => c.toUpperCase())

  // Add period at end if no terminal punctuation
  if (!/[.!?]$/.test(t)) t += '.'

  return t
}
