// ── Segmentation Service ─────────────────────────────────────────────────────
//
// Contract: splitIntoSegments(transcript) → RawSegment[]
//
// Splits a transcript string into smaller semantic units (sentences /
// thought-level chunks). Currently uses regex sentence splitting.
//
// To upgrade: replace the function body with an LLM call that returns
// JSON segment boundaries. The output shape stays the same.

export interface RawSegment {
  index: number
  text: string
}

export function splitIntoSegments(transcript: string): RawSegment[] {
  // 1. Split on sentence-ending punctuation followed by whitespace or end
  const parts = transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  // 2. Merge trailing fragments shorter than 5 words into the previous segment
  //    to avoid orphan stubs like "Right." or "Yeah."
  const merged: string[] = []
  for (const part of parts) {
    const wordCount = part.split(/\s+/).length
    if (merged.length > 0 && wordCount < 5) {
      merged[merged.length - 1] += ' ' + part
    } else {
      merged.push(part)
    }
  }

  return merged.map((text, index) => ({ index, text }))
}
