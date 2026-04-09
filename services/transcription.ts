// ── Transcription Service ────────────────────────────────────────────────────
//
// Two-step contract:
//   1. transcribeBlob(blob)        → raw ASR string  (swap provider here)
//   2. cleanTranscript(raw)        → normalized string for segmentation
//
// To connect a real provider, replace the body of transcribeBlob() only.
// cleanTranscript() is provider-agnostic and stays here.

// ── Stub transcripts (rotate on each call) ───────────────────────────────────

export async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', blob, blob.type.includes('wav') ? 'recording.wav' : 'recording.webm')

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Transcription failed')
  }

  const json = (await response.json()) as { text?: string }
  return json.text?.trim() ?? ''
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
