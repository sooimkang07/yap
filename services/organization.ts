// ── Organization Service ─────────────────────────────────────────────────────
//
// Takes transcribed VoiceMessages and infers reply relationships across segments.
//
// Multi-signal scoring (all signals combined into 0–1 score):
//   - keyword-overlap   : Jaccard similarity over non-stop-word tokens
//   - topic-overlap     : shared named topics (capitalized mid-sentence words)
//   - question-response : prior segment ends with '?'
//   - discourse-ref     : candidate starts with a reply word (yeah, right, about that…)
//
// To upgrade: replace scoreMatch() with an LLM call returning { segmentId, confidence }[]
// organizeMessages() and buildThreads() stay the same.

import type { VoiceMessage, VoiceSegment, OrganizedSegment, OrganizedSegmentWithDepth } from '@/types'

// ── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'i','a','an','the','is','are','was','were','be','been','being',
  'and','or','but','so','yet','nor','to','of','in','it','its',
  'that','this','for','on','with','as','at','by','from','into',
  'we','you','they','he','she','my','your','our','their',
  'have','has','had','do','did','does','will','would','could',
  'should','may','might','shall','not','also','just','up','out',
  'if','about','then','there','here','when','what','which','who',
  'how','all','any','one','two','three','some','more','very',
  'really','think','know','want','need','going','get','got','let',
  'look','looks','like','just','actually','basically','right',
  'yeah','yes','okay','ok','so','well','hey','hi',
])

function keywords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const aArr = Array.from(a)
  const bArr = Array.from(b)
  const intersection = aArr.filter((w) => b.has(w)).length
  const union = new Set(aArr.concat(bArr)).size
  return intersection / union
}

// Capitalized words that appear mid-sentence → likely named topics
function namedTopics(text: string): string[] {
  return text
    .split(/\s+/)
    .slice(1) // skip first word (always capitalized)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length > 3 && w[0] === w[0].toUpperCase() && /[a-z]/.test(w))
    .map((w) => w.toLowerCase())
}

// Words that signal the candidate is responding to something
const REPLY_STARTERS = [
  'yeah', 'right', 'exactly', 'totally', 'true', 'agreed', 'no,', 'yes,',
  'for that', 'about that', 'on that', 'to your point', 'regarding',
  'speaking of', 're:', 'and about', 'about the', 'about bali', 'about ubud',
  'about september', 'about the villa', 'about the flights',
]

// ── Scoring ───────────────────────────────────────────────────────────────────

type AnnotatedSegment = VoiceSegment & { createdAt: string }

function scoreMatch(
  candidate: AnnotatedSegment,
  prior: AnnotatedSegment
): { score: number; signals: string[] } {
  const signals: string[] = []
  let score = 0

  // 1. Keyword overlap
  const kwScore = jaccard(keywords(candidate.text), keywords(prior.text))
  if (kwScore >= 0.08) {
    score += kwScore * 1.4
    signals.push(`keyword-overlap(${(kwScore * 100).toFixed(0)}%)`)
  }

  // 2. Named topic overlap
  const sharedTopics = namedTopics(prior.text).filter((t) =>
    namedTopics(candidate.text).includes(t)
  )
  if (sharedTopics.length > 0) {
    const topicScore = Math.min(sharedTopics.length * 0.18, 0.45)
    score += topicScore
    signals.push(`topic-overlap(${sharedTopics.join(',')})`)
  }

  // 3. Question-response
  if (prior.text.trim().endsWith('?')) {
    score += 0.28
    signals.push('question-response')
  }

  // 4. Discourse reference at start of candidate
  const candLower = candidate.text.toLowerCase()
  if (REPLY_STARTERS.some((w) => candLower.startsWith(w))) {
    score += 0.22
    signals.push('discourse-ref')
  }

  return { score: Math.min(score, 1.0), signals }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function organizeMessages(messages: VoiceMessage[]): OrganizedSegment[] {
  const sorted = messages
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Flatten to annotated segments in chronological order
  const flat: AnnotatedSegment[] = sorted.flatMap((msg) =>
    msg.segments.map((seg) => ({ ...seg, createdAt: msg.createdAt }))
  )

  const THRESHOLD = 0.18

  return flat.map((current, i) => {
    const priors = flat.slice(0, i).filter((p) => p.speaker !== current.speaker)

    let bestScore = THRESHOLD
    let bestMatch: AnnotatedSegment | null = null
    let bestSignals: string[] = []

    for (const prior of priors) {
      const { score, signals } = scoreMatch(current, prior)
      if (score > bestScore) {
        bestScore = score
        bestMatch = prior
        bestSignals = signals
      }
    }

    const reason = bestMatch
      ? `[${bestSignals.join(' + ')}] → "${bestMatch.text.slice(0, 60)}${bestMatch.text.length > 60 ? '…' : ''}"`
      : 'no match above threshold — new thread root'

    return {
      segment: current,
      createdAt: current.createdAt,
      replyToSegmentId: bestMatch?.id ?? null,
      replyToMessageId: bestMatch?.sourceMessageId ?? null,
      confidence: bestMatch ? bestScore : 1.0,
      signals: bestSignals,
      reason,
    }
  })
}

// ── Thread builder ──��─────────────────────────────────────────────────────────
// Returns segments in DFS order with depth annotation, ready for sequential rendering.

export function buildThreads(organized: OrganizedSegment[]): OrganizedSegmentWithDepth[] {
  const result: OrganizedSegmentWithDepth[] = []
  const visited = new Set<string>()

  function visit(segId: string, depth: number) {
    if (visited.has(segId)) return
    visited.add(segId)

    const item = organized.find((s) => s.segment.id === segId)
    if (!item) return

    result.push({ ...item, depth })

    const children = organized.filter((s) => s.replyToSegmentId === segId)
    for (const child of children) {
      visit(child.segment.id, depth + 1)
    }
  }

  for (const root of organized.filter((s) => s.replyToSegmentId === null)) {
    visit(root.segment.id, 0)
  }

  return result
}
