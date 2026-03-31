export type MessageStatus = 'recorded' | 'transcribing' | 'transcribed' | 'error'

// ── Raw recording produced by MediaRecorder ──────────────────────────────────
export interface VoiceMessage {
  id: string
  speaker: string        // participant id
  createdAt: string      // ISO
  audioUrl: string       // object URL from MediaRecorder, or '' for seed data
  duration: number       // seconds
  status: MessageStatus
  rawTranscript: string | null   // direct ASR output
  cleanTranscript: string | null // after normalization/cleanup
  segments: VoiceSegment[]
  error: string | null
}

// ── Derived thought unit from transcript segmentation ─────────────────────────
// One VoiceMessage → one or more VoiceSegments
export interface VoiceSegment {
  id: string
  sourceMessageId: string
  speaker: string
  index: number           // position within source message
  text: string
  // Reserved for future segment-level audio slicing (not yet implemented)
  audioStartMs: number | null
  audioEndMs: number | null
}

// ── Organization service output (computed, never stored) ──────────────────────
export interface OrganizedSegment {
  segment: VoiceSegment
  createdAt: string       // from source message
  replyToSegmentId: string | null
  replyToMessageId: string | null
  confidence: number      // 0–1
  signals: string[]       // which signals fired, for debug panel
  reason: string          // human-readable summary
}

export interface OrganizedSegmentWithDepth extends OrganizedSegment {
  depth: number
}
