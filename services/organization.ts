// ── Organization Service ─────────────────────────────────────────────────────
//
// Takes a flat list of VoiceMessages (each with segments) and infers a
// reply-tree across segments from different senders.
//
// Algorithm (first-pass heuristic):
//   For each segment Si, find the prior segment Sj (from a different sender)
//   with the highest Jaccard similarity over non-stop-word tokens.
//   If similarity ≥ threshold → Si replies to Sj.
//   Otherwise → Si is a new root.
//
// To upgrade: replace inferReplyTarget() with an LLM call that returns
// structured reply pairs. organizeMessages() and buildThreads() stay the same.

import type { VoiceMessage, VoiceSegment, OrganizedSegment } from '@/types'

// ── Keyword extraction ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'i', 'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'and', 'or', 'but', 'so', 'yet', 'nor', 'to', 'of', 'in', 'it', 'its',
  'that', 'this', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'into',
  'we', 'you', 'they', 'he', 'she', 'my', 'your', 'our', 'their', 'its',
  'have', 'has', 'had', 'do', 'did', 'does', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'not', 'also', 'just', 'up', 'out',
  'if', 'about', 'then', 'there', 'here', 'when', 'what', 'which', 'who',
  'how', 'all', 'any', 'one', 'two', 'three', 'some', 'more', 'very',
  'really', 'think', 'know', 'want', 'need', 'going', 'get', 'got',
])

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const aArr = Array.from(a)
  const bArr = Array.from(b)
  const intersection = aArr.filter((w) => b.has(w)).length
  const union = new Set(aArr.concat(bArr)).size
  return intersection / union
}

// ── Core inference ───────────────────────────────────────────────────────────

type AnnotatedSegment = VoiceSegment & { senderId: string; createdAt: string }

function inferReplyTarget(
  candidate: AnnotatedSegment,
  priors: AnnotatedSegment[],
  threshold = 0.12
): { match: AnnotatedSegment | null; score: number } {
  const candKeys = extractKeywords(candidate.text)

  let bestScore = threshold
  let bestMatch: AnnotatedSegment | null = null

  for (const prior of priors) {
    // Only link across different senders
    if (prior.senderId === candidate.senderId) continue

    const score = jaccardSimilarity(candKeys, extractKeywords(prior.text))
    if (score > bestScore) {
      bestScore = score
      bestMatch = prior
    }
  }

  return { match: bestMatch, score: bestScore }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function organizeMessages(messages: VoiceMessage[]): OrganizedSegment[] {
  // Flatten all segments across messages in chronological order
  const flat: AnnotatedSegment[] = messages
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .flatMap((msg) =>
      msg.segments.map((seg) => ({
        ...seg,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
      }))
    )

  return flat.map((current, i) => {
    const priors = flat.slice(0, i)
    const { match, score } = inferReplyTarget(current, priors)

    const reason = match
      ? `${(score * 100).toFixed(0)}% keyword overlap with "${match.text.slice(0, 55)}${match.text.length > 55 ? '…' : ''}"`
      : 'no matching prior segment — treated as new thread root'

    return {
      segment: { id: current.id, messageId: current.messageId, index: current.index, text: current.text },
      senderId: current.senderId,
      createdAt: current.createdAt,
      replyToSegmentId: match?.id ?? null,
      replyToMessageId: match?.messageId ?? null,
      confidence: match ? score : 1.0,
      reason,
    }
  })
}

// ── Thread builder ───────────────────────────────────────────────────────────

export interface OrganizedSegmentWithDepth extends OrganizedSegment {
  depth: number
}

// Converts a flat OrganizedSegment[] into a depth-annotated list in tree order.
// Roots first, then their children in DFS order — ready for sequential rendering.
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

  const roots = organized.filter((s) => s.replyToSegmentId === null)
  for (const root of roots) {
    visit(root.segment.id, 0)
  }

  return result
}
