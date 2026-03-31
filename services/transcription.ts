// ── Transcription Service ────────────────────────────────────────────────────
//
// Contract: transcribeBlob(blob) → Promise<string>
//
// Currently a stub that returns rotating sample transcripts.
// To connect a real API, replace the function body only — the signature
// and the rest of the pipeline stay the same.
//
// Example swap-in (OpenAI Whisper):
//   const form = new FormData()
//   form.append('file', blob, 'audio.webm')
//   form.append('model', 'whisper-1')
//   const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}` },
//     body: form,
//   })
//   const data = await res.json()
//   return data.text

const STUB_TRANSCRIPTS = [
  "Yeah so I was thinking about this more and I think the main issue is the timeline. Three weeks feels really tight. What if we cut the API integration from the initial demo scope and just focus on the core recording and playback flow?",
  "I actually had a chance to look at the design doc you sent. Left a few comments in section two about the data model. I think we need a cleaner separation between the raw audio and the transcript layer. Also wanted to flag that the segment linking logic might be more complex than we thought.",
  "Quick update on my end — the recording prototype is working locally. Playback is solid. The transcription stub is in place so we can wire in a real API whenever. I think we're in good shape for the demo. Let me know if you want to do a quick review call this week.",
  "One more thing I forgot to mention — the design doc has a section on privacy that we haven't talked about yet. I think we need to decide early whether audio stays on device or goes to a server. That decision affects a lot of the architecture downstream.",
]

let stubIndex = 0

export async function transcribeBlob(_blob: Blob): Promise<string> {
  // Simulate realistic transcription latency
  await new Promise((r) => setTimeout(r, 1400))
  const text = STUB_TRANSCRIPTS[stubIndex % STUB_TRANSCRIPTS.length]
  stubIndex++
  return text
}
