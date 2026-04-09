'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { VoiceMessage, VoiceSegment } from '@/types'
import { transcribeBlob, cleanTranscript } from '@/services/transcription'
import { requestReplies } from '@/services/reply'
import { synthesizeSpeech } from '@/services/tts'
import { splitIntoSegments } from '@/services/segmentation'
import { generateBatch } from '@/lib/audioGen'
import { buildReplyMessage, detectTopics } from '@/lib/replyEngine'
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
// besties💛 group chat — dinner recap / insta dump / Chloe's work story.
// audioUrl starts as '' — generated client-side on mount via generateBatch().

function buildSeedMessages(): VoiceMessage[] {
  const seeds: Array<{ id: string; speaker: string; createdAt: string; duration: number; text: string }> = [
    {
      id: 'seed-chloe-1', speaker: 'chloe', createdAt: ago(460), duration: 5,
      text: "Does anyone remember who's phone we took the dinner pics on?",
    },
    {
      id: 'seed-maria-1', speaker: 'maria', createdAt: ago(453), duration: 7,
      text: "Oh yeah, it was on mine. Sorry, I just put them in the shared album.",
    },
    {
      id: 'seed-you-1', speaker: 'me', createdAt: ago(25), duration: 9,
      text: "Wait guys the pics turned out so good. I'm gonna insta dump later, so I'll need everyone's input.",
    },
    {
      id: 'seed-chloe-2', speaker: 'chloe', createdAt: ago(20), duration: 22,
      text: "Also guys the craziest thing happened to me at work today. One of my patients thought I was his mom. He was 47 by the way. Like huh? And he was getting so erratic, so I had to pretend to be his mom the whole session to get him to finish his eval.",
    },
    {
      id: 'seed-sarah-1', speaker: 'sarah', createdAt: ago(15), duration: 9,
      text: "@Chloe, that's insane! Did he think he was a baby or could you still talk to him like an adult?",
    },
    {
      id: 'seed-lainey-1', speaker: 'lainey', createdAt: ago(10), duration: 6,
      text: "Lmao guys not @Chloe literally cosplaying mommy at work. I'm dead.",
    },
    {
      id: 'seed-you-2', speaker: 'me', createdAt: ago(5), duration: 5,
      text: "Bro of course only that would happen to you. Was this a new patient?",
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
  addRecording: (blob: Blob, duration: number, url: string) => Promise<{ startPlaybackFromId: string | null }>
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
      const createdAt = new Date().toISOString()

      // Optimistic add — audio plays immediately
      setMessages((prev) => [
        ...prev,
        {
          id,
          speaker: 'me',
          createdAt,
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
        const conversationForReplies = [
          ...messagesRef.current.filter((message) => message.id !== id),
          {
            id,
            speaker: 'me',
            createdAt,
            audioUrl: url,
            duration,
            status: 'transcribed',
            rawTranscript: raw,
            cleanTranscript: clean,
            segments,
            error: null,
          } satisfies VoiceMessage,
        ]
        const selected = await requestReplies(clean, conversationForReplies)

        // 3. Log debug info
        setReplyDebugLog((prev) => [
          ...prev,
          { timestamp: new Date().toISOString(), userTranscript: clean, detectedTopics: topics, selectedReplies: selected },
        ])

        // 4. Generate voice replies and insert them in order
        if (selected.length > 0) {
          const replyMessages: VoiceMessage[] = []

          for (let i = 0; i < selected.length; i++) {
            const reply = selected[i]
            const audio = await synthesizeSpeech(
              reply.option.speaker,
              reply.option.text,
              reply.option.duration
            )

            replyMessages.push({
              ...buildReplyMessage(reply.option, audio.url, id),
              createdAt: new Date(Date.now() + (i + 1) * 1000).toISOString(),
              duration: audio.duration,
            })
          }

          setMessages((prev) => [...prev, ...replyMessages])
        }

        return { startPlaybackFromId: id }
      } catch (err) {
        patch(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Transcription failed',
        })
        return { startPlaybackFromId: null }
      }
    },
    [patch]
  )

  return { messages, audioReady, addRecording, replyDebugLog }
}
