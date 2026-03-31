// ── Reply Engine ──────────────────────────────────────────────────────────────
// After the user records and transcription completes, this module selects
// contextually appropriate replies from fake participants.
//
// Pipeline:
//   1. detectTopics(transcript)    → string[]
//   2. selectReplies(topics, pool) → SelectedReply[]
//   3. Caller generates audio + inserts messages with delay
//
// To upgrade: replace selectReplies() with an LLM call that returns
// structured reply selections. Output shape stays the same.

import type { VoiceMessage, VoiceSegment } from '@/types'
import { splitIntoSegments } from '@/services/segmentation'
import { makeId } from '@/lib/utils'

// ── Reply pool ────────────────────────────────────────────────────────────────

export interface ReplyOption {
  id: string
  speaker: 'priya' | 'dani' | 'alex'
  text: string
  category: string
  triggerKeywords: string[]
  duration: number // estimated seconds
}

export const REPLY_POOL: ReplyOption[] = [
  // ── Budget ──────────────────────────────────────────────────────────────
  {
    id: 'r-budget-alex',
    speaker: 'alex',
    text: "Yeah fifteen hundred sounds totally reasonable. If we split the villa four ways we should come in well under budget.",
    category: 'budget',
    triggerKeywords: ['budget', 'fifteen', 'hundred', 'cost', 'afford', 'money', 'spend', 'price', 'cheap', 'expensive'],
    duration: 7,
  },
  {
    id: 'r-budget-dani',
    speaker: 'dani',
    text: "Splitting the villa cost between four people makes such a difference. I was a bit worried about budget but that actually works.",
    category: 'budget',
    triggerKeywords: ['budget', 'split', 'cost', 'afford', 'four', 'divide', 'share', 'expensive'],
    duration: 8,
  },

  // ── Timing / September ──────────────────────────────────────────────────
  {
    id: 'r-timing-priya',
    speaker: 'priya',
    text: "Late September actually works better for me too. The weather in Bali is also a bit more predictable at the end of the month.",
    category: 'timing',
    triggerKeywords: ['september', 'late', 'timing', 'dates', 'calendar', 'schedule', 'conference', 'work trip', 'leave'],
    duration: 9,
  },
  {
    id: 'r-timing-dani',
    speaker: 'dani',
    text: "Just checked and I'm free from the 20th onwards. Late September is perfect, let's lock those dates.",
    category: 'timing',
    triggerKeywords: ['september', 'dates', 'calendar', 'late', 'free', 'timing', 'schedule', '20th'],
    duration: 6,
  },
  {
    id: 'r-timing-alex',
    speaker: 'alex',
    text: "Conference ends on the 14th. So if we leave the 15th or 16th of September that gives us a full week in Bali.",
    category: 'timing',
    triggerKeywords: ['conference', 'september', 'leave', 'dates', '12th', '14th', 'after', 'timing'],
    duration: 8,
  },

  // ── Accommodation / Villa ────────────────────────────────────────────────
  {
    id: 'r-villa-priya',
    speaker: 'priya',
    text: "I found a four-bedroom villa in Ubud on Airbnb with a private pool. It actually fits our budget split four ways.",
    category: 'accommodation',
    triggerKeywords: ['villa', 'ubud', 'airbnb', 'accommodation', 'rooms', 'stay', 'pool', 'bedroom', 'house'],
    duration: 8,
  },
  {
    id: 'r-villa-alex',
    speaker: 'alex',
    text: "The Airbnb options in Ubud are way better than I expected. Private pool villas are really affordable when you split them.",
    category: 'accommodation',
    triggerKeywords: ['villa', 'airbnb', 'ubud', 'pool', 'split', 'accommodation', 'affordable', 'private'],
    duration: 8,
  },
  {
    id: 'r-villa-dani',
    speaker: 'dani',
    text: "Definitely prefer a villa over separate rooms. More space, more social, and we can cook some meals to save money.",
    category: 'accommodation',
    triggerKeywords: ['villa', 'rooms', 'separate', 'accommodation', 'stay', 'space', 'social', 'cook'],
    duration: 8,
  },

  // ── Surfing / Canggu ─────────────────────────────────────────────────────
  {
    id: 'r-surf-dani',
    speaker: 'dani',
    text: "The Canggu surf spot is absolutely incredible in late September. We can do a day trip from Ubud, it's only about an hour each way.",
    category: 'activities',
    triggerKeywords: ['canggu', 'surf', 'surfing', 'waves', 'beach', 'board', 'ride', 'sport'],
    duration: 9,
  },
  {
    id: 'r-surf-priya',
    speaker: 'priya',
    text: "I've never tried surfing but I'm absolutely down to learn. Dani can you teach us the basics before we go?",
    category: 'activities',
    triggerKeywords: ['surf', 'surfing', 'canggu', 'learn', 'try', 'waves', 'never', 'basics'],
    duration: 7,
  },
  {
    id: 'r-surf-alex',
    speaker: 'alex',
    text: "I took a few surf lessons a couple years ago. Canggu is one of the best beginner breaks in Bali actually.",
    category: 'activities',
    triggerKeywords: ['surf', 'surfing', 'canggu', 'lessons', 'beginner', 'bali', 'break'],
    duration: 7,
  },

  // ── Flights ─────────────────────────────────────────────────────────────
  {
    id: 'r-flights-alex',
    speaker: 'alex',
    text: "AirAsia has some solid deals via Kuala Lumpur for late September. Way cheaper than flying direct if we're flexible.",
    category: 'flights',
    triggerKeywords: ['flights', 'flying', 'airline', 'ticket', 'airasia', 'cheap', 'book', 'fly', 'bali', 'kuala lumpur'],
    duration: 8,
  },
  {
    id: 'r-flights-priya',
    speaker: 'priya',
    text: "Scoot has a sale on right now for Bali. Should we book before prices jump? I can share the link.",
    category: 'flights',
    triggerKeywords: ['flights', 'book', 'prices', 'bali', 'airline', 'ticket', 'sale', 'fly'],
    duration: 6,
  },

  // ── Scooters / Transport ─────────────────────────────────────────────────
  {
    id: 'r-transport-dani',
    speaker: 'dani',
    text: "Scooters are basically the only way to get around in Bali. We should rent four, it's super cheap and much more flexible than taxis.",
    category: 'transport',
    triggerKeywords: ['scooter', 'transport', 'get around', 'taxi', 'uber', 'rent', 'bike', 'motorbike', 'travel'],
    duration: 9,
  },
  {
    id: 'r-transport-priya',
    speaker: 'priya',
    text: "I'm a bit nervous about riding scooters in traffic. Maybe we can use grab for some trips and scooters for the more scenic routes?",
    category: 'transport',
    triggerKeywords: ['scooter', 'transport', 'taxi', 'grab', 'nervous', 'traffic', 'ride', 'motorbike'],
    duration: 9,
  },

  // ── General fallback ─────────────────────────────────────────────────────
  {
    id: 'r-general-dani',
    speaker: 'dani',
    text: "This trip is going to be amazing honestly. I've been wanting to go back to Bali for years.",
    category: 'general',
    triggerKeywords: [],
    duration: 6,
  },
  {
    id: 'r-general-alex',
    speaker: 'alex',
    text: "Agreed. Should we set up a shared doc to track everything? Flights, villa options, budget, activities.",
    category: 'general',
    triggerKeywords: [],
    duration: 7,
  },
  {
    id: 'r-general-priya',
    speaker: 'priya',
    text: "So excited about this. Let's try to lock in dates soon so we can start booking things.",
    category: 'general',
    triggerKeywords: [],
    duration: 6,
  },
]

// ── Topic detection ───────────────────────────────────────────────────────────

const TOPIC_MAP: Record<string, string[]> = {
  budget:        ['budget', 'fifteen', 'hundred', 'cost', 'afford', 'money', 'spend', 'price', 'cheap', 'expensive', 'split'],
  timing:        ['september', 'timing', 'late', 'conference', 'work trip', 'schedule', 'dates', 'calendar', 'leave', '12th', '14th', '20th'],
  accommodation: ['villa', 'ubud', 'airbnb', 'accommodation', 'rooms', 'stay', 'house', 'pool', 'bedroom'],
  activities:    ['canggu', 'surf', 'surfing', 'waves', 'beach', 'board', 'ride', 'lesson', 'sport', 'activities'],
  flights:       ['flights', 'flying', 'airline', 'ticket', 'airasia', 'cheap', 'book', 'fly', 'scoot', 'kuala lumpur'],
  transport:     ['scooter', 'transport', 'taxi', 'grab', 'motorbike', 'bike', 'get around', 'rent'],
}

export function detectTopics(transcript: string): string[] {
  const lower = transcript.toLowerCase()
  return Object.entries(TOPIC_MAP)
    .filter(([, kws]) => kws.some((kw) => lower.includes(kw)))
    .map(([topic]) => topic)
}

// ── Reply selection ───────────────────────────────────────────────────────────

export interface SelectedReply {
  option: ReplyOption
  matchedKeywords: string[]
  reason: string
}

export function selectReplies(
  transcript: string,
  recentMessages: VoiceMessage[]
): SelectedReply[] {
  const lower = transcript.toLowerCase()

  // Score every reply by keyword matches
  const scored = REPLY_POOL.map((r) => {
    const matched = r.triggerKeywords.filter((kw) => lower.includes(kw))
    return { reply: r, score: matched.length, matched }
  }).sort((a, b) => b.score - a.score)

  // Prefer speakers who haven't spoken in the last 2 messages
  const recentSpeakers = new Set(recentMessages.slice(-2).map((m) => m.speaker))

  const selected: typeof scored[0][] = []
  const usedSpeakers = new Set<string>()

  for (const candidate of scored) {
    if (selected.length >= 2) break
    if (usedSpeakers.has(candidate.reply.speaker)) continue
    // Prefer non-recent speakers, but don't block if we need a fallback
    if (recentSpeakers.has(candidate.reply.speaker) && selected.length === 0 && scored.indexOf(candidate) > 3) continue
    selected.push(candidate)
    usedSpeakers.add(candidate.reply.speaker)
  }

  // Always return at least 1 reply (general fallback)
  if (selected.length === 0) {
    const fallback = REPLY_POOL.filter(
      (r) => r.category === 'general' && !recentSpeakers.has(r.speaker)
    )
    const pick = fallback[Math.floor(Math.random() * fallback.length)] ?? REPLY_POOL[REPLY_POOL.length - 1]
    selected.push({ reply: pick, score: 0, matched: [] })
  }

  return selected.map((s) => ({
    option: s.reply,
    matchedKeywords: s.matched,
    reason:
      s.matched.length > 0
        ? `keyword match: [${s.matched.join(', ')}] → category "${s.reply.category}"`
        : 'fallback — no keyword match',
  }))
}

// ── Message builder ───────────────────────────────────────────────────────────
// Builds a VoiceMessage from a ReplyOption + generated audio URL.
// Call generateSpeakerAudio() from the caller to get the audioUrl.

export function buildReplyMessage(
  option: ReplyOption,
  audioUrl: string,
  replyToMessageId: string | null
): VoiceMessage {
  const id = makeId()
  const segments: VoiceSegment[] = splitIntoSegments(option.text).map((s, i) => ({
    id: `${id}-${i}`,
    sourceMessageId: id,
    speaker: option.speaker,
    index: i,
    text: s.text,
    audioStartMs: null,
    audioEndMs: null,
  }))

  return {
    id,
    speaker: option.speaker,
    createdAt: new Date().toISOString(),
    audioUrl,
    duration: option.duration,
    status: 'transcribed',
    rawTranscript: option.text,
    cleanTranscript: option.text,
    segments,
    error: null,
  }
}
