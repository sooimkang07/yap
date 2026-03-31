'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { VoiceMessage, VoiceSegment } from '@/types'
import { transcribeBlob, cleanTranscript } from '@/services/transcription'
import { splitIntoSegments } from '@/services/segmentation'
import { generateSpeakerAudio, generateBatch } from '@/lib/audioGen'
import { selectReplies, buildReplyMessage, detectTopics } from '@/lib/replyEngine'
import type { SelectedReply } from '@/lib/replyEngine'
import { makeId } from '@/lib/utils'

// ── Segment builder ───────────────────────────────────────────────────────────

function buildSegments(messageId: string, speaker: string, text: string): VoiceSegment[] {
  return splitIntoSegments(text).map((s, i) => ({
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

// ── Seed data ─────────────────────────────────────────────────────────────────
// 4-person group conversation about a Bali trip.
// audioUrl starts as '' — generated client-side on mount via generateBatch().

function buildSeedMessages(): VoiceMessage[] {
  const seeds: Array<{ id: string; speaker: string; createdAt: string; duration: number; text: string }> = [
    {
      id: 'seed-p1', speaker: 'priya', createdAt: ago(60), duration: 24,
      text: "Hey everyone, so I found some really good flight deals to Bali for early September. Also I wanted to ask about accommodation — should we do a villa or separate rooms? And Dani, did you look into that surf spot in Canggu you mentioned last time?",
    },
    {
      id: 'seed-d1', speaker: 'dani', createdAt: ago(50), duration: 31,
      text: "About the Canggu surf spot, yes I looked it up and it's incredible in September. The villa idea sounds way better than separate rooms. But wait, September might clash with my work trip — let me check my calendar. Also Priya, what airline did you find those Bali flight deals on?",
    },
    {
      id: 'seed-a1', speaker: 'alex', createdAt: ago(40), duration: 28,
      text: "To your point about September, I have a conference on the 12th so we need to leave after that. The villa in Ubud looks perfect and splitting the cost makes it affordable. I checked Airbnb and found some good options. What's everyone's budget for the whole trip?",
    },
    {
      id: 'seed-m1', speaker: 'me', createdAt: ago(30), duration: 33,
      text: "Yeah the Ubud villa options on Airbnb look amazing. For budget I'm thinking around fifteen hundred total including flights. Also about the September timing, could we do late September to avoid the conference and the work trip? And I've been wanting to try surfing so the Canggu spot sounds perfect.",
    },
  ]

  return seeds.map((s) => ({
    id: s.id,
    speaker: s.speaker,
    createdAt: s.createdAt,
    audioUrl: '',          // filled in by useEffect below
    duration: s.duration,
    status: 'transcribed' as const,
    rawTranscript: s.text,
    cleanTranscript: s.text,
    segments: buildSegments(s.id, s.speaker, s.text),
    error: null,
  }))
}

// ── Debug state ───────────────────────────────────────────────────────────────

export interface ReplyDebugEntry {
  timestamp: string
  userTranscript: string
  detectedTopics: string[]
  selectedReplies: SelectedReply[]
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseConversationReturn {
  messages: VoiceMessage[]
  audioReady: boolean        // true once seed audio is generated
  addRecording: (blob: Blob, duration: number, url: string) => Promise<void>
  replyDebugLog: ReplyDebugEntry[]
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<VoiceMessage[]>(buildSeedMessages)
  const [audioReady, setAudioReady] = useState(false)
  const [replyDebugLog, setReplyDebugLog] = useState<ReplyDebugEntry[]>([])

  // Keep a ref so reply callbacks see the latest messages
  const messagesRef = useRef<VoiceMessage[]>(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  // ── Generate seed audio on mount ────────────────────────────────────────
  useEffect(() => {
    const seeds = messagesRef.current.filter((m) => !m.audioUrl)
    if (seeds.length === 0) { setAudioReady(true); return }

    generateBatch(seeds.map((m) => ({ id: m.id, speakerId: m.speaker, duration: m.duration })))
      .then((urlMap) => {
        setMessages((prev) =>
          prev.map((m) => (urlMap[m.id] ? { ...m, audioUrl: urlMap[m.id] } : m))
        )
        setAudioReady(true)
      })
      .catch(() => setAudioReady(true)) // degrade gracefully
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback((id: string, update: Partial<VoiceMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...update } : m)))
  }, [])

  // ── Add recording ───────────────────────────────────────────────────────
  const addRecording = useCallback(
    async (blob: Blob, duration: number, url: string) => {
      const id = makeId()

      // Optimistic add — audio plays immediately
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
        // 1. Transcribe
        const raw = await transcribeBlob(blob)
        const clean = cleanTranscript(raw)
        const segments = buildSegments(id, 'me', clean)
        patch(id, { status: 'transcribed', rawTranscript: raw, cleanTranscript: clean, segments })

        // 2. Detect topics + select replies
        const topics = detectTopics(clean)
        const selected = selectReplies(clean, messagesRef.current)

        // 3. Log debug info
        setReplyDebugLog((prev) => [
          ...prev,
          { timestamp: new Date().toISOString(), userTranscript: clean, detectedTopics: topics, selectedReplies: selected },
        ])

        // 4. Generate and insert replies with staggered delays
        for (let i = 0; i < selected.length; i++) {
          const sr = selected[i]
          await new Promise((r) => setTimeout(r, 1200 + i * 1800))

          const audioUrl = await generateSpeakerAudio(sr.option.speaker, sr.option.duration)
          const replyMsg = buildReplyMessage(sr.option, audioUrl, id)
          setMessages((prev) => [...prev, replyMsg])
        }
      } catch (err) {
        patch(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Transcription failed',
        })
      }
    },
    [patch]
  )

  return { messages, audioReady, addRecording, replyDebugLog }
}
