'use client'

import { useState } from 'react'
import type { OrganizedSegmentWithDepth, VoiceMessage } from '@/types'
import { getParticipant } from '@/lib/participants'
import { formatRelativeTime } from '@/lib/utils'
import AudioPlayer from './AudioPlayer'

interface SegmentCardProps {
  item: OrganizedSegmentWithDepth
  sourceMessage: VoiceMessage | undefined
  replyToSegment?: { text: string; speaker: string } // parent context label
}

export default function SegmentCard({ item, sourceMessage, replyToSegment }: SegmentCardProps) {
  const [audioOpen, setAudioOpen] = useState(false)
  const mine = item.segment.speaker === 'me'
  const p = getParticipant(item.segment.speaker)

  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      {/* Reply-to context */}
      {replyToSegment && (
        <div className={`flex items-center gap-1 text-xs px-1 ${mine ? 'flex-row-reverse' : ''}`}>
          <span className="text-gray-300">↩</span>
          <span className="text-gray-400 truncate max-w-[200px]">
            {getParticipant(replyToSegment.speaker).name}: "{replyToSegment.text.slice(0, 45)}{replyToSegment.text.length > 45 ? '…' : ''}"
          </span>
        </div>
      )}

      <div
        className={`rounded-xl px-3 py-2 w-full max-w-[88%] flex flex-col gap-2 ${
          mine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Speaker + time */}
        <div className={`flex items-center justify-between gap-2 text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>
          <span className="font-medium">{p.name}</span>
          <span>{formatRelativeTime(item.createdAt)}</span>
        </div>

        {/* Segment text (primary content) */}
        <p className={`text-sm leading-relaxed ${mine ? 'text-white/90' : 'text-gray-800'}`}>
          {item.segment.text}
        </p>

        {/* Play source message — expandable */}
        {sourceMessage && (
          <div>
            <button
              onClick={() => setAudioOpen((o) => !o)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                mine ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{audioOpen ? '▾' : '▸'}</span>
              <span>Full message · {sourceMessage.duration}s</span>
            </button>
            {audioOpen && sourceMessage.audioUrl && (
              <div className="mt-1.5">
                <AudioPlayer url={sourceMessage.audioUrl} duration={sourceMessage.duration} light={mine} />
              </div>
            )}
            {audioOpen && !sourceMessage.audioUrl && (
              <span className={`text-xs ${mine ? 'text-white/30' : 'text-gray-400'}`}>
                No audio (seed message)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
