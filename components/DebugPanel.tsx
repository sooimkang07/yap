'use client'

import { useState } from 'react'
import type { VoiceMessage } from '@/types'
import { organizeMessages } from '@/services/organization'
import { getParticipant } from '@/lib/participants'
import type { PlayerState } from '@/hooks/useConversationPlayer'
import type { ReplyDebugEntry } from '@/hooks/useConversation'

type Tab = 'messages' | 'organization' | 'replies' | 'queue'

interface DebugPanelProps {
  messages: VoiceMessage[]
  playerState: PlayerState
  replyDebugLog: ReplyDebugEntry[]
}

export default function DebugPanel({ messages, playerState, replyDebugLog }: DebugPanelProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('messages')

  const transcribed = messages.filter((m) => m.status === 'transcribed')
  const organized = organizeMessages(transcribed)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden text-xs font-mono">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-600">Debug Panel</span>
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {(['messages', 'organization', 'replies', 'queue'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 px-3 py-1.5 capitalize transition-colors ${
                  tab === t
                    ? 'bg-white text-gray-900 font-semibold border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-80 p-3 flex flex-col gap-3 bg-white">

            {/* ── Messages ────────────────────────────────────────────────── */}
            {tab === 'messages' && (
              messages.length === 0
                ? <p className="text-gray-400">No messages.</p>
                : messages
                    .slice()
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((m) => <MessageDebug key={m.id} message={m} />)
            )}

            {/* ── Organization ────────────────────────────────────────────── */}
            {tab === 'organization' && (
              organized.length === 0
                ? <p className="text-gray-400">No transcribed messages.</p>
                : organized.map((o) => (
                  <div key={o.segment.id} className="border-b border-gray-100 pb-2 last:border-0 flex flex-col gap-0.5">
                    <div>
                      <span className="font-semibold text-gray-800">{o.segment.id}</span>
                      {' '}<span className="text-gray-500">({getParticipant(o.segment.speaker).name})</span>
                    </div>
                    <div className="pl-2 text-gray-600">"{o.segment.text.slice(0, 80)}{o.segment.text.length > 80 ? '…' : ''}"</div>
                    <div className="pl-2 text-gray-500">
                      reply_to:{' '}
                      {o.replyToSegmentId
                        ? <span className="text-blue-600">{o.replyToSegmentId}</span>
                        : <span className="text-green-600">null (root)</span>
                      }
                    </div>
                    <div className="pl-2 text-gray-500">
                      confidence: {(o.confidence * 100).toFixed(0)}%
                      {o.signals.length > 0 && <span className="text-gray-400 ml-1">· {o.signals.join(', ')}</span>}
                    </div>
                    <div className="pl-2 text-gray-400 italic">{o.reason}</div>
                  </div>
                ))
            )}

            {/* ── Replies ─────────────────────────────────────────────────── */}
            {tab === 'replies' && (
              replyDebugLog.length === 0
                ? <p className="text-gray-400">No replies generated yet. Record a message to trigger replies.</p>
                : replyDebugLog
                    .slice()
                    .reverse()
                    .map((entry, i) => (
                      <div key={i} className="border-b border-gray-100 pb-3 last:border-0 flex flex-col gap-1">
                        <div className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                        <div>
                          <span className="text-gray-400">topics detected: </span>
                          <span className="text-gray-700">
                            {entry.detectedTopics.length > 0 ? entry.detectedTopics.join(', ') : 'none'}
                          </span>
                        </div>
                        <div className="text-gray-400">transcript: <span className="text-gray-600 italic">"{entry.userTranscript.slice(0, 80)}…"</span></div>
                        {entry.selectedReplies.map((sr, j) => (
                          <div key={j} className="pl-2 border-l border-gray-200 flex flex-col gap-0.5 mt-1">
                            <div className="font-semibold text-gray-700">
                              {getParticipant(sr.option.speaker).name} · {sr.option.category} · {sr.option.duration}s
                            </div>
                            <div className="text-gray-600">"{sr.option.text.slice(0, 80)}…"</div>
                            <div className="text-gray-400 italic">{sr.reason}</div>
                            {sr.matchedKeywords.length > 0 && (
                              <div className="text-gray-400">keywords: [{sr.matchedKeywords.join(', ')}]</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
            )}

            {/* ── Queue ───────────────────────────────────────────────────── */}
            {tab === 'queue' && (
              <>
                <div className="text-gray-500 mb-1">
                  Status: <span className={playerState.isPlaying ? 'text-green-600' : 'text-gray-400'}>
                    {playerState.isPlaying ? 'playing' : 'stopped'}
                  </span>
                  {playerState.isPlaying && (
                    <span className="text-gray-400 ml-2">
                      [{playerState.queueIndex + 1}/{playerState.queue.length}]
                    </span>
                  )}
                </div>
                {playerState.queue.length === 0
                  ? <p className="text-gray-400">Queue is empty. Press "Play all" to start.</p>
                  : playerState.queue.map((msgId, i) => {
                    const msg = messages.find((m) => m.id === msgId)
                    const isCurrent = i === playerState.queueIndex && playerState.isPlaying
                    return (
                      <div
                        key={msgId}
                        className={`flex items-center gap-2 ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        <span>{isCurrent ? '▶' : `${i + 1}.`}</span>
                        <span className={isCurrent ? 'font-semibold' : ''}>
                          {msg ? getParticipant(msg.speaker).name : msgId}
                        </span>
                        <span className="text-gray-300">{msg?.duration}s</span>
                        {!msg?.audioUrl && <span className="text-yellow-500">no audio</span>}
                      </div>
                    )
                  })
                }
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MessageDebug({ message: m }: { message: VoiceMessage }) {
  const [rawOpen, setRawOpen] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(false)

  return (
    <div className="border-b border-gray-100 pb-3 last:border-0 flex flex-col gap-1">
      <div>
        <span className="font-semibold text-gray-800">[{getParticipant(m.speaker).name}]</span>
        {' '}id:{m.id}
        {' '}
        <span className={
          m.status === 'transcribed' ? 'text-green-600'
          : m.status === 'transcribing' ? 'text-yellow-600'
          : m.status === 'error' ? 'text-red-600'
          : 'text-gray-500'
        }>{m.status}</span>
        {' '}{m.duration}s
        {m.segments.length > 0 && <span className="text-gray-400"> · {m.segments.length} segs</span>}
        {m.audioUrl ? <span className="text-green-600 ml-1">✓ audio</span> : <span className="text-yellow-600 ml-1">⟳ audio</span>}
      </div>

      {m.rawTranscript && (
        <div>
          <button onClick={() => setRawOpen((o) => !o)} className="text-gray-400 hover:text-gray-700">
            {rawOpen ? '▾' : '▸'} raw
          </button>
          {rawOpen && <div className="pl-2 mt-0.5 text-gray-600 border-l border-gray-200 whitespace-pre-wrap">{m.rawTranscript}</div>}
        </div>
      )}

      {m.cleanTranscript && m.cleanTranscript !== m.rawTranscript && (
        <div>
          <button onClick={() => setCleanOpen((o) => !o)} className="text-gray-400 hover:text-gray-700">
            {cleanOpen ? '▾' : '▸'} clean
          </button>
          {cleanOpen && <div className="pl-2 mt-0.5 text-gray-700 border-l border-gray-200 whitespace-pre-wrap">{m.cleanTranscript}</div>}
        </div>
      )}

      {m.segments.length > 0 && (
        <div className="pl-2 flex flex-col gap-0.5">
          {m.segments.map((s) => (
            <div key={s.id} className="text-gray-600">[{s.index}] {s.text}</div>
          ))}
        </div>
      )}

      {m.error && <div className="text-red-500">error: {m.error}</div>}
    </div>
  )
}
