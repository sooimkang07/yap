'use client'

import { useState } from 'react'
import type { VoiceMessage } from '@/types'
import { getParticipant } from '@/lib/participants'
import { formatRelativeTime } from '@/lib/utils'
import AudioPlayer from './AudioPlayer'

interface VoiceNoteProps {
  message: VoiceMessage
}

export default function VoiceNote({ message }: VoiceNoteProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const mine = message.speaker === 'me'
  const p = getParticipant(message.speaker)

  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-gray-400 px-1">{p.name}</span>

      <div
        className={`rounded-2xl px-3 py-2.5 w-full max-w-[88%] flex flex-col gap-2 ${
          mine ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {/* ── Audio (primary) ── */}
        {message.audioUrl ? (
          <AudioPlayer url={message.audioUrl} duration={message.duration} light={mine} />
        ) : (
          <div className={`flex items-center gap-2 text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>
            <span>🎙</span>
            <span>{message.duration}s</span>
            <span>·</span>
            <span>seed</span>
          </div>
        )}

        {/* ── Status ── */}
        {message.status === 'transcribing' && (
          <span className={`text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>
            Transcribing…
          </span>
        )}

        {/* ── Segment count pill ── */}
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
              <div className={`mt-1.5 text-sm leading-relaxed ${mine ? 'text-white/80' : 'text-gray-700'}`}>
                {message.cleanTranscript}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {message.error && (
          <p className="text-xs text-red-400">{message.error}</p>
        )}
      </div>

      <span className="text-xs text-gray-400 px-1">
        {formatRelativeTime(message.createdAt)}
      </span>
    </div>
  )
}
