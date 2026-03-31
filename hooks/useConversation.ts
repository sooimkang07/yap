'use client'

import { useState, useCallback } from 'react'
import type { VoiceMessage, VoiceSegment } from '@/types'
import { transcribeBlob } from '@/services/transcription'
import { splitIntoSegments } from '@/services/segmentation'
import { makeId } from '@/lib/utils'

function buildSegments(messageId: string, transcript: string): VoiceSegment[] {
  return splitIntoSegments(transcript).map((s) => ({
    id: `${messageId}-${s.index}`,
    messageId,
    index: s.index,
    text: s.text,
  }))
}

const t = (minsAgo: number) =>
  new Date(Date.now() - minsAgo * 60 * 1000).toISOString()

// ── Seed data ────────────────────────────────────────────────────────────────
// Pre-populated conversation so the organized view is meaningful on first load.
// Transcripts are intentionally cross-referential so the organization algorithm
// has overlapping keywords to work with.

function buildSeedMessages(): VoiceMessage[] {
  const m1 = 'seed-m1'
  const t1 =
    "Hey, wanted to loop you in on the project timeline. We're looking at a demo in about three weeks. I think we need to nail down the core features by end of this week. Also, did you get a chance to look at the design doc I sent over?"

  const m2 = 'seed-m2'
  const t2 =
    "Yeah I looked at the design doc, I left some comments in section two. On the timeline, three weeks feels tight but doable if we scope it right. What features are you thinking are absolutely essential for the demo? I was going to ask you about the API integration too — is that in scope?"

  const m3 = 'seed-m3'
  const t3 =
    "The API integration is a stretch goal for now. For the demo the core features are recording, playback, and the organization view. Your comment about scoping the timeline was really helpful. Let me know what you think about the timeline after you've had a chance to think it over."

  return [
    {
      id: m1, senderId: 'alex', createdAt: t(45),
      audioUrl: '', duration: 22, status: 'transcribed',
      transcript: t1, segments: buildSegments(m1, t1), error: null,
    },
    {
      id: m2, senderId: 'me', createdAt: t(30),
      audioUrl: '', duration: 31, status: 'transcribed',
      transcript: t2, segments: buildSegments(m2, t2), error: null,
    },
    {
      id: m3, senderId: 'alex', createdAt: t(15),
      audioUrl: '', duration: 27, status: 'transcribed',
      transcript: t3, segments: buildSegments(m3, t3), error: null,
    },
  ]
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseConversationReturn {
  messages: VoiceMessage[]
  addRecording: (blob: Blob, duration: number, url: string) => Promise<void>
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<VoiceMessage[]>(buildSeedMessages)

  const patchMessage = useCallback((id: string, patch: Partial<VoiceMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const addRecording = useCallback(
    async (blob: Blob, duration: number, url: string) => {
      const id = makeId()

      // 1. Add message immediately with 'transcribing' status
      const draft: VoiceMessage = {
        id,
        senderId: 'me',
        createdAt: new Date().toISOString(),
        audioUrl: url,
        duration,
        status: 'transcribing',
        transcript: null,
        segments: [],
        error: null,
      }
      setMessages((prev) => [...prev, draft])

      // 2. Transcribe → segment → update
      try {
        const transcript = await transcribeBlob(blob)
        const segments = buildSegments(id, transcript)
        patchMessage(id, { status: 'transcribed', transcript, segments })
      } catch (err) {
        patchMessage(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Transcription failed',
        })
      }
    },
    [patchMessage]
  )

  return { messages, addRecording }
}
