'use client'

import { useState } from 'react'
import type { VoiceMessage } from '@/types'
import { organizeMessages } from '@/services/organization'

interface DebugPanelProps {
  messages: VoiceMessage[]
}

export default function DebugPanel({ messages: allMessages }: DebugPanelProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'organization'>('messages')

  const transcribed = allMessages.filter((m) => m.status === 'transcribed')
  const organized = organizeMessages(transcribed)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden text-xs font-mono">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 text-left"
      >
        <span className="font-semibold text-gray-600">Debug Panel</span>
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            {(['messages', 'organization'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-center capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-gray-800 font-medium border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-72 p-3 flex flex-col gap-4 bg-white">
            {/* ── Messages tab ───────────────────────────────────────────── */}
            {activeTab === 'messages' && (
              <>
                {allMessages.length === 0 && (
                  <p className="text-gray-400">No messages yet.</p>
                )}
                {allMessages.map((m) => (
                  <div key={m.id} className="flex flex-col gap-1 border-b border-gray-100 pb-3 last:border-0">
                    <div className="text-gray-500">
                      <span className="text-gray-800 font-semibold">[{m.senderId}]</span>
                      {' '}id:{m.id}
                      {' '}status:<span className={statusColor(m.status)}>{m.status}</span>
                      {' '}dur:{m.duration}s
                    </div>

                    {m.transcript && (
                      <div>
                        <div className="text-gray-400">transcript:</div>
                        <div className="text-gray-700 whitespace-pre-wrap pl-2 border-l border-gray-200">
                          {m.transcript}
                        </div>
                      </div>
                    )}

                    {m.segments.length > 0 && (
                      <div>
                        <div className="text-gray-400">segments ({m.segments.length}):</div>
                        {m.segments.map((s) => (
                          <div key={s.id} className="pl-2 text-gray-600">
                            [{s.index}] {s.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.error && (
                      <div className="text-red-500">error: {m.error}</div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── Organization tab ────────────────────────────────────────── */}
            {activeTab === 'organization' && (
              <>
                {organized.length === 0 && (
                  <p className="text-gray-400">No transcribed messages to organize.</p>
                )}
                {organized.map((o) => (
                  <div key={o.segment.id} className="border-b border-gray-100 pb-2 last:border-0">
                    <div className="text-gray-800">
                      <span className="font-semibold">{o.segment.id}</span>
                      {' '}
                      <span className="text-gray-500">({o.senderId})</span>
                    </div>
                    <div className="pl-2 text-gray-600">text: {o.segment.text}</div>
                    <div className="pl-2 text-gray-500">
                      reply_to:{' '}
                      {o.replyToSegmentId
                        ? <span className="text-blue-600">{o.replyToSegmentId}</span>
                        : <span className="text-green-600">null (root)</span>
                      }
                    </div>
                    <div className="pl-2 text-gray-500">
                      confidence: {(o.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="pl-2 text-gray-400 italic">{o.reason}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function statusColor(status: string) {
  if (status === 'transcribed') return ' text-green-600'
  if (status === 'transcribing') return ' text-yellow-600'
  if (status === 'error') return ' text-red-600'
  return ' text-gray-600'
}
