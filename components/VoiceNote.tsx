'use client'

import { useState } from 'react'
import type { VoiceMessage } from '@/types'
import { getParticipant } from '@/lib/participants'
import { formatRelativeTime } from '@/lib/utils'
import AudioPlayer from './AudioPlayer'

interface VoiceNoteProps {
  message: VoiceMessage
  isActive?: boolean      // true when conversation player is playing this message
  onPlayFrom?: () => void // clicking ▶ starts conversation from this message
}

export default function VoiceNote({ message, isActive = false, onPlayFrom }: VoiceNoteProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const mine = message.speaker === 'me'
  const p = getParticipant(message.speaker)

  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      {/* Speaker label */}
      <span className={`text-xs px-1 transition-colors ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
        {p.name}
        {isActive && <span className="ml-1 text-gray-400">· speaking</span>}
      </span>

      {/* Bubble */}
      <div
        className={`rounded-2xl px-3 py-2.5 w-full max-w-[88%] flex flex-col gap-2 transition-all ${
          mine
            ? `bg-gray-900 text-white rounded-br-sm ${isActive ? 'ring-2 ring-gray-500' : ''}`
            : `bg-gray-100 text-gray-900 rounded-bl-sm ${isActive ? 'ring-2 ring-gray-300' : ''}`
        }`}
      >
        {/* ── Audio (primary) ── */}
        {message.audioUrl ? (
          <AudioPlayer url={message.audioUrl} duration={message.duration} light={mine} />
        ) : (
          <div className={`flex items-center gap-2 text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>
            <span>🎙</span>
            <span>{message.duration}s</span>
            {message.status === 'transcribed' && <span className="text-gray-300">· generating audio…</span>}
          </div>
        )}

        {/* ── Status line ── */}
        {message.status === 'transcribing' && (
          <span className={`text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>Transcribing…</span>
        )}
        {message.segments.length > 0 && (
          <span className={`text-xs ${mine ? 'text-white/40' : 'text-gray-400'}`}>
            {message.segments.length} segment{message.segments.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* ── Transcript (collapsed by default) ── */}
        {message.cleanTranscript && (
          <div>
            <button
              onClick={() => setTranscriptOpen((o) => !o)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                mine ? 'text-white/50 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{transcriptOpen ? '▾' : '▸'}</span>
              <span>Transcript</span>
            </button>
            {transcriptOpen && (
              <p className={`mt-1.5 text-sm leading-relaxed ${mine ? 'text-white/80' : 'text-gray-700'}`}>
                {message.cleanTranscript}
              </p>
            )}
          </div>
        )}

        {message.error && <p className="text-xs text-red-400">{message.error}</p>}
      </div>

      {/* Timestamp + play-from-here */}
      <div className={`flex items-center gap-2 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs text-gray-400">{formatRelativeTime(message.createdAt)}</span>
        {onPlayFrom && message.audioUrl && (
          <button
            onClick={onPlayFrom}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            title="Play conversation from here"
          >
            ▶ from here
          </button>
        )}
      </div>
    </div>
  )
}
