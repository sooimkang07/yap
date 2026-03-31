import type { VoiceMessage } from '@/types'
import VoiceNote from './VoiceNote'

interface ConversationFeedProps {
  messages: VoiceMessage[]
}

export default function ConversationFeed({ messages }: ConversationFeedProps) {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((msg) => (
        <VoiceNote key={msg.id} message={msg} />
      ))}
    </div>
  )
}
