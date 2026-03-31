'use client'

import { useRecorder } from '@/hooks/useRecorder'
import type { RecordingResult } from '@/hooks/useRecorder'
import { formatDuration } from '@/lib/utils'

interface RecorderProps {
  onRecorded: (blob: Blob, duration: number, url: string) => void
}

export default function Recorder({ onRecorded }: RecorderProps) {
  const { state, elapsed, start, stop, error } = useRecorder()

  async function handleClick() {
    if (state === 'idle') {
      await start()
    } else {
      const result: RecordingResult | null = await stop()
      if (result) {
        onRecorded(result.blob, result.duration, result.url)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 ${
          state === 'recording'
            ? 'bg-red-500 scale-105 shadow-md shadow-red-200'
            : 'bg-gray-900 hover:bg-gray-700'
        }`}
        aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
      >
        {state === 'recording' ? <StopIcon /> : <MicIcon />}
      </button>

      <span className={`text-xs tabular-nums ${state === 'recording' ? 'text-red-500' : 'text-gray-400'}`}>
        {state === 'recording' ? formatDuration(elapsed) : 'Tap to record'}
      </span>

      {error && (
        <span className="text-xs text-red-500 text-center max-w-[200px]">{error}</span>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}
