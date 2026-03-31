'use client'

import { useState } from 'react'
import type { VoiceMessage } from '@/types'
import { organizeMessages } from '@/services/organization'
import { getParticipant } from '@/lib/participants'

type Tab = 'messages' | 'organization'

export default function DebugPanel({ messages }: { messages: VoiceMessage[] }) {
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
          <div className="flex border-b border-gray-200">
            {(['messages', 'organization'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 capitalize transition-colors ${
                  tab === t
                    ? 'bg-white text-gray-900 font-semibold border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-80 p-3 flex flex-col gap-4 bg-white">

            {/* ── Messages tab ─────────────────────────────────────────── */}
            {tab === 'messages' && (
              messages.length === 0
                ? <p className="text-gray-400">No messages yet.</p>
                : messages.map((m) => (
                  <MessageDebug key={m.id} message={m} />
                ))
            )}

            {/* ── Organization tab ──────────────────────────────────────── */}
            {tab === 'organization' && (
              organized.length === 0
                ? <p className="text-gray-400">No transcribed messages to organize.</p>
                : organized.map((o) => (
                  <div key={o.segment.id} className="border-b border-gray-100 pb-2 last:border-0 flex flex-col gap-0.5">
                    <div>
                      <span className="font-semibold text-gray-800">{o.segment.id}</span>
                      {' '}
                      <span className="text-gray-500">({getParticipant(o.segment.speaker).name})</span>
                    </div>
                    <div className="pl-2 text-gray-600 leading-snug">"{o.segment.text}"</div>
                    <div className="pl-2 text-gray-500">
                      reply_to:{' '}
                      {o.replyToSegmentId
                        ? <span className="text-blue-600">{o.replyToSegmentId}</span>
                        : <span className="text-green-600">null (root)</span>
                      }
                    </div>
                    <div className="pl-2 text-gray-500">
                      confidence: {(o.confidence * 100).toFixed(0)}%
                      {o.signals.length > 0 && (
                        <span className="text-gray-400 ml-1">· {o.signals.join(', ')}</span>
                      )}
                    </div>
                    <div className="pl-2 text-gray-400 italic">{o.reason}</div>
                  </div>
                ))
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
      <div className="text-gray-700">
        <span className="font-semibold">[{getParticipant(m.speaker).name}]</span>
        {' '}id:{m.id}
        {' '}
        <span className={
          m.status === 'transcribed' ? 'text-green-600'
          : m.status === 'transcribing' ? 'text-yellow-600'
          : m.status === 'error' ? 'text-red-600'
          : 'text-gray-500'
        }>{m.status}</span>
        {' '}{m.duration}s
        {m.segments.length > 0 && ` · ${m.segments.length} segments`}
      </div>

      {m.rawTranscript && (
        <div>
          <button onClick={() => setRawOpen((o) => !o)} className="text-gray-400 hover:text-gray-600">
            {rawOpen ? '▾' : '▸'} raw transcript
          </button>
          {rawOpen && (
            <div className="pl-2 mt-0.5 text-gray-600 border-l border-gray-200 leading-snug whitespace-pre-wrap">
              {m.rawTranscript}
            </div>
          )}
        </div>
      )}

      {m.cleanTranscript && (
        <div>
          <button onClick={() => setCleanOpen((o) => !o)} className="text-gray-400 hover:text-gray-600">
            {cleanOpen ? '▾' : '▸'} clean transcript
          </button>
          {cleanOpen && (
            <div className="pl-2 mt-0.5 text-gray-700 border-l border-gray-200 leading-snug whitespace-pre-wrap">
              {m.cleanTranscript}
            </div>
          )}
        </div>
      )}

      {m.segments.length > 0 && (
        <div className="pl-2 flex flex-col gap-0.5 mt-0.5">
          <span className="text-gray-400">segments:</span>
          {m.segments.map((s) => (
            <div key={s.id} className="text-gray-600">
              [{s.index}] {s.text}
            </div>
          ))}
        </div>
      )}

      {m.error && <div className="text-red-500 pl-2">error: {m.error}</div>}
    </div>
  )
}
