import type { VoiceMessage } from '@/types'
import { selectReplies, type SelectedReply } from '@/lib/replyEngine'

interface ReplyResponse {
  replies?: SelectedReply[]
}

export async function requestReplies(
  transcript: string,
  recentMessages: VoiceMessage[]
): Promise<SelectedReply[]> {
  try {
    const response = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, recentMessages }),
    })

    if (!response.ok) {
      throw new Error(`Reply request failed with ${response.status}`)
    }

    const json = (await response.json()) as ReplyResponse
    if (Array.isArray(json.replies) && json.replies.length > 0) return json.replies
  } catch {
    // Fall through to local selection.
  }

  return selectReplies(transcript, recentMessages, 2)
}
