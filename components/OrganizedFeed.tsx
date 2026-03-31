import type { VoiceMessage } from '@/types'
import type { OrganizedSegmentWithDepth } from '@/services/organization'
import { organizeMessages, buildThreads } from '@/services/organization'
import { formatRelativeTime } from '@/lib/utils'

interface OrganizedFeedProps {
  messages: VoiceMessage[]
}

const SENDER_LABELS: Record<string, string> = {
  me: 'You',
  alex: 'Alex',
}

export default function OrganizedFeed({ messages }: OrganizedFeedProps) {
  const transcribed = messages.filter((m) => m.status === 'transcribed' && m.segments.length > 0)
  const organized = organizeMessages(transcribed)
  const threaded = buildThreads(organized)

  if (threaded.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No transcribed messages yet.
      </p>
    )
  }

  // Insert thread-header markers before each root (depth === 0)
  const items: Array<{ type: 'header'; index: number } | { type: 'segment'; item: OrganizedSegmentWithDepth }> = []
  let threadIndex = 0
  for (const item of threaded) {
    if (item.depth === 0) {
      threadIndex++
      items.push({ type: 'header', index: threadIndex })
    }
    items.push({ type: 'segment', item })
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((entry, i) => {
        if (entry.type === 'header') {
          return (
            <div key={`header-${i}`} className="pt-4 pb-1 first:pt-0">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                Thread {entry.index}
              </span>
            </div>
          )
        }

        const { item } = entry
        const mine = item.senderId === 'me'
        const label = SENDER_LABELS[item.senderId] ?? item.senderId
        const indentPx = item.depth * 16

        return (
          <div
            key={item.segment.id}
            className="flex flex-col gap-0.5 mb-2"
            style={{ marginLeft: indentPx }}
          >
            {item.depth > 0 && (
              <div
                className="border-l-2 border-gray-200 absolute"
                style={{ marginLeft: -indentPx }}
              />
            )}

            <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                mine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {item.depth > 0 && (
                  <div className={`text-xs mb-1 ${mine ? 'text-white/40' : 'text-gray-400'}`}>
                    ↩ replying
                  </div>
                )}
                {item.segment.text}
                <div className={`text-xs mt-1.5 ${mine ? 'text-white/40' : 'text-gray-400'}`}>
                  {label} · {formatRelativeTime(item.createdAt)}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
