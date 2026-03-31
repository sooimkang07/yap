'use client'

import { useState, useCallback } from 'react'
import type { VoiceMessage, VoiceSegment } from '@/types'
import { transcribeBlob, cleanTranscript } from '@/services/transcription'
import { splitIntoSegments } from '@/services/segmentation'
import { makeId } from '@/lib/utils'

function buildSegments(messageId: string, speaker: string, clean: string): VoiceSegment[] {
  return splitIntoSegments(clean).map((s, i) => ({
    id: `${messageId}-${i}`,
    sourceMessageId: messageId,
    speaker,
    index: i,
    text: s.text,
    audioStartMs: null,
    audioEndMs: null,
  }))
}

const ago = (mins: number) => new Date(Date.now() - mins * 60 * 1000).toISOString()

// ── 4-person group chat seed data ────────────────────────────────────────────
// Conversation about planning a group trip to Bali.
// Transcripts are cross-referential so the organization algorithm has
// overlapping keywords and topics to work with across all four speakers.

function buildSeedMessages(): VoiceMessage[] {
  const msgs: Array<Omit<VoiceMessage, 'segments'> & { cleanTranscript: string }> = [
    {
      id: 'seed-p1',
      speaker: 'priya',
      createdAt: ago(60),
      audioUrl: '',
      duration: 24,
      status: 'transcribed',
      rawTranscript: "hey everyone so i found some really good flight deals to bali for early september also i wanted to ask about accommodation should we do a villa or separate rooms and dani did you look into that surf spot in canggu you mentioned last time",
      cleanTranscript: "Hey everyone, so I found some really good flight deals to Bali for early September. Also I wanted to ask about accommodation — should we do a villa or separate rooms? And Dani, did you look into that surf spot in Canggu you mentioned last time?",
      error: null,
    },
    {
      id: 'seed-d1',
      speaker: 'dani',
      createdAt: ago(50),
      audioUrl: '',
      duration: 31,
      status: 'transcribed',
      rawTranscript: "about the canggu surf spot yes i looked it up and it's incredible in september the villa idea sounds way better than separate rooms but wait september might clash with my work trip let me check my calendar also priya what airline did you find those bali flight deals on",
      cleanTranscript: "About the Canggu surf spot, yes I looked it up and it's incredible in September. The villa idea sounds way better than separate rooms. But wait, September might clash with my work trip — let me check my calendar. Also Priya, what airline did you find those Bali flight deals on?",
      error: null,
    },
    {
      id: 'seed-a1',
      speaker: 'alex',
      createdAt: ago(40),
      audioUrl: '',
      duration: 28,
      status: 'transcribed',
      rawTranscript: "to your point about september i have a conference on the 12th so we need to leave after that the villa in ubud looks perfect and splitting the cost makes it affordable i checked airbnb and found some good options what's everyone's budget for the whole trip",
      cleanTranscript: "To your point about September, I have a conference on the 12th so we need to leave after that. The villa in Ubud looks perfect and splitting the cost makes it affordable. I checked Airbnb and found some good options. What's everyone's budget for the whole trip?",
      error: null,
    },
    {
      id: 'seed-m1',
      speaker: 'me',
      createdAt: ago(30),
      audioUrl: '',
      duration: 33,
      status: 'transcribed',
      rawTranscript: "yeah the ubud villa options on airbnb look amazing for budget i'm thinking around fifteen hundred total including flights also about the september timing could we do late september to avoid the conference and the work trip and i've been wanting to try surfing so the canggu spot sounds perfect",
      cleanTranscript: "Yeah the Ubud villa options on Airbnb look amazing. For budget I'm thinking around fifteen hundred total including flights. Also about the September timing, could we do late September to avoid the conference and the work trip? And I've been wanting to try surfing so the Canggu spot sounds perfect.",
      error: null,
    },
  ]

  return msgs.map((m) => ({
    ...m,
    segments: buildSegments(m.id, m.speaker, m.cleanTranscript),
  }))
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseConversationReturn {
  messages: VoiceMessage[]
  addRecording: (blob: Blob, duration: number, url: string) => Promise<void>
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<VoiceMessage[]>(buildSeedMessages)

  const patch = useCallback((id: string, update: Partial<VoiceMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...update } : m)))
  }, [])

  const addRecording = useCallback(
    async (blob: Blob, duration: number, url: string) => {
      const id = makeId()

      // Optimistic add — show player immediately
      setMessages((prev) => [
        ...prev,
        {
          id,
          speaker: 'me',
          createdAt: new Date().toISOString(),
          audioUrl: url,
          duration,
          status: 'transcribing',
          rawTranscript: null,
          cleanTranscript: null,
          segments: [],
          error: null,
        },
      ])

      try {
        const raw = await transcribeBlob(blob)
        const clean = cleanTranscript(raw)
        const segments = buildSegments(id, 'me', clean)
        patch(id, { status: 'transcribed', rawTranscript: raw, cleanTranscript: clean, segments })
      } catch (err) {
        patch(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Transcription failed',
        })
      }
    },
    [patch]
  )

  return { messages, addRecording }
}
