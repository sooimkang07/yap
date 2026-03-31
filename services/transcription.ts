// ── Transcription Service ────────────────────────────────────────────────────
//
// Two-step contract:
//   1. transcribeBlob(blob)        → raw ASR string  (swap provider here)
//   2. cleanTranscript(raw)        → normalized string for segmentation
//
// To connect a real provider, replace the body of transcribeBlob() only.
// cleanTranscript() is provider-agnostic and stays here.

// ── Stub transcripts (rotate on each call) ───────────────────────────────────

const STUB_TRANSCRIPTS = [
  "Yeah the Ubud villa options on Airbnb look amazing. For budget I'm thinking around fifteen hundred total including flights. Also about the September timing could we do late September to avoid the conference and the work trip. And I've been wanting to try surfing so the Canggu spot sounds perfect.",
  "To your point about budget I think fifteen hundred is realistic if we split the villa cost. About the flights though I found cheaper options if we fly via Kuala Lumpur. Also did anyone look into renting scooters in Bali because that's basically the only way to get around.",
  "Wait I just checked and the villa in Ubud is still available for late September. Also Dani's surf spot in Canggu is only about an hour from Ubud. But the conference ends on the 14th so we should plan to leave on the 15th at the earliest. What does everyone think about that timeline.",
  "About the scooter question yes we definitely need scooters in Bali. For the September dates I can do any time after the 14th. Also I wanted to flag that the villa on Airbnb has a five night minimum so we should probably plan for at least a week.",
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
