// ── Segmentation Service ─────────────────────────────────────────────────────
//
// Contract: splitIntoSegments(cleanTranscript) → RawSegment[]
//
// Strategy:
//   1. Mark split boundaries before discourse markers
//   2. Split further on sentence-ending punctuation
//   3. Merge orphan fragments (< 5 words) into previous segment
//
// Discourse markers signal a speaker shifting to a new thought/topic.
// These are the primary split signals beyond punctuation.
//
// To upgrade: replace the function body with an LLM boundary-detection call.
// Output shape stays the same.

export interface RawSegment {
  index: number
  text: string
}

// Markers that signal a new thought unit when they appear mid-utterance.
// Matched case-insensitively, at word boundary, optionally followed by comma.
const DISCOURSE_MARKER_RE = new RegExp(
  [
    'wait',
    'also',
    'but\\s+(?:actually|also|wait|then)',
    'and\\s+also',
    'for\\s+that',
    'to\\s+your\\s+point',
    'about\\s+(?:the\\s+)?\\w+',   // "about the villa", "about Bali", etc.
    'on\\s+(?:that|this|the\\s+\\w+)',
    'speaking\\s+of',
    'separately',
    'one\\s+(?:more|other)\\s+thing',
    'actually',
    'regarding',
  ]
    .map((m) => `(?:^|(?<=\\s))(${m})[,\\s]`)
    .join('|'),
  'gi'
)

export function splitIntoSegments(transcript: string): RawSegment[] {
  // Step 1: insert split sentinel before each discourse marker
  //         (but not at the very start of the string)
  let marked = transcript
  marked = marked.replace(
    new RegExp(
      `(?<!^)(?<=[\\s])(?=(?:${[
        'wait',
        'also',
        'but\\s+(?:actually|also|wait|then)',
        'and\\s+also',
        'for\\s+that',
        'to\\s+your\\s+point',
        'about\\s+(?:the\\s+)?\\w+',
        'on\\s+(?:that|this)',
        'speaking\\s+of',
        'separately',
        'one\\s+(?:more|other)\\s+thing',
        'actually',
        'regarding',
      ].join('|')})\\b)`,
      'gi'
    ),
    '|||'
  )

  // Step 2: split on sentence-ending punctuation, then on ||| markers
  const sentenceParts = marked
    .split(/(?<=[.!?])\s+/)
    .flatMap((s) => s.split('|||'))
    .map((s) => s.trim())
    .filter(Boolean)

  // Step 3: merge fragments shorter than 5 words into the previous segment
  const merged: string[] = []
  for (const part of sentenceParts) {
    const wordCount = part.split(/\s+/).length
    if (merged.length > 0 && wordCount < 5) {
      merged[merged.length - 1] += ' ' + part
    } else {
      merged.push(part)
    }
  }

  return merged.map((text, index) => ({ index, text }))
}
