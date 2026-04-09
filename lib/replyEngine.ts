// ── Reply Engine ──────────────────────────────────────────────────────────────
// After the user records and transcription completes, this module selects
// contextually appropriate replies from AI participants.
//
// Pipeline:
//   1. detectTopics(transcript)    → string[]
//   2. selectReplies(topics, pool) → SelectedReply[]
//   3. Caller inserts messages with delay
//
// To upgrade: replace selectReplies() with an LLM call that returns
// structured reply selections. Output shape stays the same.

import type { VoiceMessage, VoiceSegment } from '@/types'
import { splitIntoSegments } from '@/services/segmentation'
import { makeId } from '@/lib/utils'

// ── Reply pool ────────────────────────────────────────────────────────────────

export interface ReplyOption {
  id: string
  speaker: 'chloe' | 'maria' | 'sarah' | 'lainey'
  text: string
  category: string
  triggerKeywords: string[]
  duration: number // estimated seconds
}

export const REPLY_POOL: ReplyOption[] = [
  // ── Photos / Insta dump ─────────────────────────────────────────────────
  {
    id: 'r-photos-chloe',
    speaker: 'chloe',
    text: "The pics are so good omg I'm already planning my captions. Someone send me that one of all of us outside.",
    category: 'photos',
    triggerKeywords: ['pics', 'photos', 'insta', 'dump', 'album', 'pictures', 'camera', 'post'],
    duration: 9,
  },
  {
    id: 'r-photos-maria',
    speaker: 'maria',
    text: "I already put a bunch in the shared album, go check. The ones from outside the restaurant came out so well.",
    category: 'photos',
    triggerKeywords: ['pics', 'photos', 'album', 'shared', 'pictures', 'insta', 'dump', 'camera'],
    duration: 9,
  },
  {
    id: 'r-photos-lainey',
    speaker: 'lainey',
    text: "Please do the insta dump I need it. Also tag me in everything obviously.",
    category: 'photos',
    triggerKeywords: ['insta', 'dump', 'post', 'tag', 'pics', 'photos'],
    duration: 6,
  },
  {
    id: 'r-photos-sarah',
    speaker: 'sarah',
    text: "Wait I took some on my phone too let me check. But yes please post, I look good in that one by the bar.",
    category: 'photos',
    triggerKeywords: ['pics', 'photos', 'post', 'insta', 'dump', 'pictures', 'input'],
    duration: 8,
  },

  // ── Chloe's work story ───────────────────────────────────────────────────
  {
    id: 'r-work-chloe',
    speaker: 'chloe',
    text: "He literally called me mom for like two hours straight. I had to fully lean in at that point. The eval took forever because I kept having to stay in character.",
    category: 'work',
    triggerKeywords: ['patient', 'mom', 'work', 'eval', 'session', 'erratic', 'pretend', 'character'],
    duration: 12,
  },
  {
    id: 'r-work-sarah',
    speaker: 'sarah',
    text: "That would genuinely send me. Like what do you even say? Do you just go full mom mode or try to redirect?",
    category: 'work',
    triggerKeywords: ['patient', 'mom', 'work', 'session', 'insane', 'crazy', 'new', 'happen'],
    duration: 10,
  },
  {
    id: 'r-work-lainey',
    speaker: 'lainey',
    text: "Chloe I'm sorry but cosplaying someone's mom at work is the funniest thing I have ever heard. I'm actually deceased.",
    category: 'work',
    triggerKeywords: ['patient', 'mom', 'work', 'cosplay', 'pretend', 'session', 'eval'],
    duration: 9,
  },
  {
    id: 'r-work-maria',
    speaker: 'maria',
    text: "Oh my god that is so unhinged but honestly kind of iconic. Did it actually work? Did he finish the eval?",
    category: 'work',
    triggerKeywords: ['patient', 'mom', 'work', 'eval', 'finish', 'session', 'insane', 'craziest'],
    duration: 9,
  },

  // ── Dinner / Night out ────────────────────────────────────────────────────
  {
    id: 'r-dinner-lainey',
    speaker: 'lainey',
    text: "Last night was so fun honestly. We need to make this a monthly thing no excuses.",
    category: 'dinner',
    triggerKeywords: ['dinner', 'last night', 'restaurant', 'food', 'night', 'out', 'ate'],
    duration: 7,
  },
  {
    id: 'r-dinner-sarah',
    speaker: 'sarah',
    text: "The food was so good too. I'm still thinking about that pasta honestly.",
    category: 'dinner',
    triggerKeywords: ['dinner', 'food', 'restaurant', 'pasta', 'ate', 'meal', 'place'],
    duration: 7,
  },
  {
    id: 'r-dinner-maria',
    speaker: 'maria',
    text: "That place was perfect, we should definitely go back. And we need to do this way more often.",
    category: 'dinner',
    triggerKeywords: ['dinner', 'restaurant', 'place', 'food', 'back', 'again', 'night'],
    duration: 8,
  },

  // ── Plans / Next time ──────────────────────────────────────────────────────
  {
    id: 'r-plans-sarah',
    speaker: 'sarah',
    text: "When are we doing this again? I need a date on the calendar. Probably not next weekend but the one after?",
    category: 'plans',
    triggerKeywords: ['next', 'plans', 'when', 'again', 'date', 'weekend', 'schedule', 'soon'],
    duration: 10,
  },
  {
    id: 'r-plans-lainey',
    speaker: 'lainey',
    text: "I'm free most weekends honestly. Just not the 19th. But let's actually lock something in this time.",
    category: 'plans',
    triggerKeywords: ['plans', 'when', 'weekend', 'free', 'date', 'schedule', 'next', 'lock'],
    duration: 9,
  },
  {
    id: 'r-plans-chloe',
    speaker: 'chloe',
    text: "Yes we need to plan the next one. I already have a list of places I want to try. Can we do a Sunday situation?",
    category: 'plans',
    triggerKeywords: ['plans', 'next', 'when', 'date', 'weekend', 'again', 'schedule', 'soon'],
    duration: 9,
  },

  // ── General fallback ──────────────────────────────────────────────────────
  {
    id: 'r-general-chloe',
    speaker: 'chloe',
    text: "Okay but last night was genuinely one of the best nights we've had in a while. I needed that so much.",
    category: 'general',
    triggerKeywords: [],
    duration: 8,
  },
  {
    id: 'r-general-maria',
    speaker: 'maria',
    text: "Agreed honestly. This is why we need to do this more often. Love you guys.",
    category: 'general',
    triggerKeywords: [],
    duration: 6,
  },
  {
    id: 'r-general-lainey',
    speaker: 'lainey',
    text: "Same. Already looking forward to the next one.",
    category: 'general',
    triggerKeywords: [],
    duration: 5,
  },
  {
    id: 'r-general-sarah',
    speaker: 'sarah',
    text: "Love this group chat. Okay but we're doing this again soon, I don't want to wait another month.",
    category: 'general',
    triggerKeywords: [],
    duration: 7,
  },
]

// ── Topic detection ───────────────────────────────────────────────────────────

const TOPIC_MAP: Record<string, string[]> = {
  photos:  ['pics', 'photos', 'insta', 'instagram', 'dump', 'album', 'shared', 'pictures', 'camera', 'post', 'tag', 'captions'],
  work:    ['patient', 'patients', 'work', 'session', 'eval', 'mom', 'erratic', 'pretend', 'clinical', 'therapy', 'hospital', 'cosplay', 'character'],
  dinner:  ['dinner', 'food', 'restaurant', 'pasta', 'ate', 'meal', 'night out', 'drinks', 'bar', 'place', 'last night'],
  plans:   ['plans', 'next time', 'when', 'weekend', 'date', 'schedule', 'calendar', 'free', 'again', 'lock'],
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
    if (selected.length >= 1) break
    if (usedSpeakers.has(candidate.reply.speaker)) continue
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
