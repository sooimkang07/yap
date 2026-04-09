import { NextResponse } from 'next/server'
import type { VoiceMessage } from '@/types'
import { makeId } from '@/lib/utils'
import { selectReplies, type SelectedReply, type ReplyOption } from '@/lib/replyEngine'
import { estimateSpeechDurationSeconds } from '@/lib/server/fallbackAudio'
import { hasOpenAIKey, openAIHeaders, parseOpenAIError } from '@/lib/server/openai'

interface ReplyRequestBody {
  transcript?: string
  recentMessages?: VoiceMessage[]
}

interface ReplyModelOutput {
  replies: Array<{
    speaker: 'chloe' | 'maria' | 'sarah' | 'lainey'
    text: string
    reason: string
  }>
}

function normalizeReply(reply: ReplyModelOutput['replies'][number]): SelectedReply {
  const option: ReplyOption = {
    id: makeId(),
    speaker: reply.speaker,
    text: reply.text.trim(),
    category: 'ai-generated',
    triggerKeywords: [],
    duration: estimateSpeechDurationSeconds(reply.text),
  }

  return {
    option,
    matchedKeywords: [],
    reason: reply.reason.trim(),
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as ReplyRequestBody
  const transcript = body.transcript?.trim()
  const recentMessages = Array.isArray(body.recentMessages) ? body.recentMessages : []

  if (!transcript) {
    return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 })
  }

  if (!hasOpenAIKey()) {
    return NextResponse.json({ replies: selectReplies(transcript, recentMessages, 2), provider: 'fallback' })
  }

  const payload = {
    model: process.env.OPENAI_REPLY_MODEL ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'You write short, natural voice memo replies for a close friends group chat.',
          'Return JSON only.',
          'Produce 1 or 2 replies from distinct speakers chosen from: chloe, maria, sarah, lainey.',
          'Keep each reply conversational, specific, and under 35 words.',
          'Do not mention being an AI or describe actions.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          transcript,
          recentMessages: recentMessages.slice(-6).map((message) => ({
            speaker: message.speaker,
            text: message.cleanTranscript ?? message.rawTranscript ?? '',
            createdAt: message.createdAt,
          })),
        }),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'voice_memo_replies',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            replies: {
              type: 'array',
              minItems: 1,
              maxItems: 2,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  speaker: {
                    type: 'string',
                    enum: ['chloe', 'maria', 'sarah', 'lainey'],
                  },
                  text: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['speaker', 'text', 'reason'],
              },
            },
          },
          required: ['replies'],
        },
      },
    },
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: openAIHeaders('application/json'),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await parseOpenAIError(response)
    return NextResponse.json({ error }, { status: response.status })
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content

  if (!content) {
    return NextResponse.json({ replies: selectReplies(transcript, recentMessages, 2), provider: 'fallback-empty' })
  }

  const parsed = JSON.parse(content) as ReplyModelOutput
  const replies = parsed.replies
    .filter((reply) => reply.text?.trim())
    .map(normalizeReply)

  if (replies.length === 0) {
    return NextResponse.json({ replies: selectReplies(transcript, recentMessages, 2), provider: 'fallback-empty' })
  }

  return NextResponse.json({ replies, provider: 'openai' })
}
