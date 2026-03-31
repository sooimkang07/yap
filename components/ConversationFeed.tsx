import type { VoiceMessage } from '@/types'
import VoiceNote from './VoiceNote'

interface ConversationFeedProps {
  messages: VoiceMessage[]
  activeMessageId?: string | null
  onPlayFrom?: (id: string) => void
}

export default function ConversationFeed({ messages, activeMessageId, onPlayFrom }: ConversationFeedProps) {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((msg) => (
        <VoiceNote
          key={msg.id}
          message={msg}
          isActive={activeMessageId === msg.id}
          onPlayFrom={onPlayFrom ? () => onPlayFrom(msg.id) : undefined}
        />
      ))}
    </div>
  )
}
