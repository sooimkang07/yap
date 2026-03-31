'use client'

import { useState, useRef, useCallback } from 'react'

export type RecorderState = 'idle' | 'recording'

export interface RecordingResult {
  blob: Blob
  duration: number
  url: string
}

export interface UseRecorderReturn {
  state: RecorderState
  elapsed: number  // seconds while recording
  start: () => Promise<void>
  stop: () => Promise<RecordingResult | null>
  error: string | null
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(100) // collect in 100ms chunks
      startTimeRef.current = Date.now()
      setState('recording')

      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied'
      setError(msg)
    }
  }, [])

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    const recorder = recorderRef.current
    if (!recorder || state !== 'recording') return null

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const url = URL.createObjectURL(blob)

        recorder.stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)

        setState('idle')
        setElapsed(0)
        resolve({ blob, duration, url })
      }

      recorder.stop()
    })
  }, [state])

  return { state, elapsed, start, stop, error }
}
