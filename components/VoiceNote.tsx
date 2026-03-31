import type { VoiceMessage } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import AudioPlayer from './AudioPlayer'

interface VoiceNoteProps {
  message: VoiceMessage
}

const SENDER_LABELS: Record<string, string> = {
  me: 'You',
  alex: 'Alex',
}

export default function VoiceNote({ message }: VoiceNoteProps) {
  const mine = message.senderId === 'me'
  const senderLabel = SENDER_LABELS[message.senderId] ?? message.senderId

  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-gray-400 px-1">{senderLabel}</span>

      <div
        className={`rounded-2xl px-3 py-2.5 w-full max-w-[85%] flex flex-col gap-2 ${
          mine
            ? 'bg-gray-900 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {/* Audio player — only when there's a real recording */}
        {message.audioUrl ? (
          <AudioPlayer url={message.audioUrl} duration={message.duration} light={mine} />
        ) : (
          <div className={`text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>
            🎙 {message.duration}s · seed message
          </div>
        )}

        {/* Status */}
        {message.status === 'transcribing' && (
          <p className={`text-xs ${mine ? 'text-white/50' : 'text-gray-400'}`}>
            Transcribing…
          </p>
        )}

        {/* Transcript */}
        {message.transcript && (
          <p className={`text-sm leading-relaxed ${mine ? 'text-white/85' : 'text-gray-700'}`}>
            {message.transcript}
          </p>
        )}

        {/* Error */}
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
