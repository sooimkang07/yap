import type { VoiceMessage } from '@/types'
import { organizeMessages, buildThreads } from '@/services/organization'
import SegmentCard from './SegmentCard'

interface OrganizedFeedProps {
  messages: VoiceMessage[]
  activeMessageId?: string | null
}

export default function OrganizedFeed({ messages, activeMessageId }: OrganizedFeedProps) {
  const transcribed = messages.filter((m) => m.status === 'transcribed' && m.segments.length > 0)

  if (transcribed.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No transcribed messages yet.</p>
  }

  const messageMap = new Map(messages.map((m) => [m.id, m]))
  const segmentMap = new Map(transcribed.flatMap((m) => m.segments.map((s) => [s.id, s])))

  const organized = organizeMessages(transcribed)
  const threaded = buildThreads(organized)

  return (
    <div className="flex flex-col gap-2">
      {threaded.map((item) => {
        const sourceMessage = messageMap.get(item.segment.sourceMessageId)
        const isActive = activeMessageId === item.segment.sourceMessageId

        let replyToSegment: { text: string; speaker: string } | undefined
        if (item.replyToSegmentId) {
          const parent = segmentMap.get(item.replyToSegmentId)
          if (parent) replyToSegment = { text: parent.text, speaker: parent.speaker }
        }

        return (
          <div
            key={item.segment.id}
            style={{ marginLeft: Math.min(item.depth, 3) * 16 }}
            className={item.depth > 0 ? 'border-l-2 border-gray-100 pl-3' : ''}
          >
            <SegmentCard
              item={item}
              sourceMessage={sourceMessage}
              replyToSegment={replyToSegment}
              isActive={isActive}
            />
          </div>
        )
      })}
    </div>
  )
}
