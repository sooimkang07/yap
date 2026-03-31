'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { VoiceMessage } from '@/types'

export interface PlayerState {
  isPlaying: boolean
  activeMessageId: string | null
  activeSpeakerId: string | null
  queue: string[]          // message IDs in play order
  queueIndex: number
}

const IDLE: PlayerState = {
  isPlaying: false,
  activeMessageId: null,
  activeSpeakerId: null,
  queue: [],
  queueIndex: 0,
}

export function useConversationPlayer(messages: VoiceMessage[]) {
  const [state, setState] = useState<PlayerState>(IDLE)

  // Keep a live ref so callbacks always see the current messages list
  const messagesRef = useRef<VoiceMessage[]>(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Stable refs so advance() never captures stale closures
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const queueRef  = useRef<string[]>([])
  const indexRef  = useRef<number>(0)
  const activeRef = useRef<boolean>(false)

  // ── stop ───────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    activeRef.current = false
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current = null
    }
    setState(IDLE)
  }, [])

  // ── play a specific index in the current queue ─────────────────────────
  const playIndex = useCallback((index: number) => {
    if (!activeRef.current) return
    const queue = queueRef.current

    if (index >= queue.length) {
      activeRef.current = false
      setState(IDLE)
      return
    }

    indexRef.current = index
    const messageId = queue[index]
    const msg = messagesRef.current.find((m) => m.id === messageId)

    setState((s) => ({
      ...s,
      isPlaying: true,
      activeMessageId: messageId,
      activeSpeakerId: msg?.speaker ?? null,
      queueIndex: index,
    }))

    // Skip messages with no audio
    if (!msg?.audioUrl) {
      setTimeout(() => playIndex(index + 1), 150)
      return
    }

    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.pause()
    }

    const audio = new Audio(msg.audioUrl)
    audioRef.current = audio
    audio.onended = () => playIndex(index + 1)
    audio.onerror = () => playIndex(index + 1)
    audio.play().catch(() => playIndex(index + 1))
  }, [])

  // ── playAll — builds queue from all playable messages ─────────────────
  const playAll = useCallback(() => {
    const queue = [...messagesRef.current]
      .filter((m) => m.status === 'transcribed' || m.status === 'recorded')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((m) => m.id)

    if (queue.length === 0) return

    queueRef.current = queue
    activeRef.current = true
    setState((s) => ({ ...s, queue, queueIndex: 0, isPlaying: true }))
    playIndex(0)
  }, [playIndex])

  // ── playFrom — starts the queue at a specific message ─────────────────
  const playFrom = useCallback((messageId: string) => {
    const queue = [...messagesRef.current]
      .filter((m) => m.status === 'transcribed' || m.status === 'recorded')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((m) => m.id)

    const startIndex = queue.indexOf(messageId)
    if (startIndex === -1) return

    queueRef.current = queue
    activeRef.current = true
    setState((s) => ({ ...s, queue, queueIndex: startIndex, isPlaying: true }))
    playIndex(startIndex)
  }, [playIndex])

  // ── skip to next ───────────────────────────────────────────────────────
  const next = useCallback(() => {
    playIndex(indexRef.current + 1)
  }, [playIndex])

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop])

  return { state, playAll, playFrom, next, stop }
}
