export type MessageStatus = 'recorded' | 'transcribing' | 'transcribed' | 'error'

export interface VoiceSegment {
  id: string
  messageId: string
  index: number
  text: string
}

// Output of the organization service — a segment with inferred reply context
export interface OrganizedSegment {
  segment: VoiceSegment
  senderId: string
  createdAt: string
  replyToSegmentId: string | null
  replyToMessageId: string | null
  confidence: number // 0–1
  reason: string     // human-readable explanation (for debug panel)
}

export interface VoiceMessage {
  id: string
  senderId: string   // 'me' or a participant id
  createdAt: string  // ISO string
  audioUrl: string   // object URL from MediaRecorder, or '' for seed data
  duration: number   // seconds
  status: MessageStatus
  transcript: string | null
  segments: VoiceSegment[]
  error: string | null
}
