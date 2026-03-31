'use client'

import { useState } from 'react'
import { useConversation } from '@/hooks/useConversation'
import { useConversationPlayer } from '@/hooks/useConversationPlayer'
import SpeakerBar from '@/components/SpeakerBar'
import ConversationFeed from '@/components/ConversationFeed'
import OrganizedFeed from '@/components/OrganizedFeed'
import Recorder from '@/components/Recorder'
import DebugPanel from '@/components/DebugPanel'

type ViewMode = 'chronological' | 'organized'

export default function DemoPage() {
  const { messages, audioReady, addRecording, replyDebugLog } = useConversation()
  const { state: playerState, playAll, playFrom, stop } = useConversationPlayer(messages)
  const [mode, setMode] = useState<ViewMode>('chronological')

  return (
    <div className="mx-auto max-w-md min-h-screen flex flex-col">

      {/* ── Speaker bar + play control ── */}
      <SpeakerBar
        playerState={playerState}
        audioReady={audioReady}
        onPlayAll={playAll}
        onStop={stop}
      />

      {/* ── View toggle ── */}
      <div className="flex border-b border-gray-100">
        <ViewTab active={mode === 'chronological'} onClick={() => setMode('chronological')}>
          Chronological
        </ViewTab>
        <ViewTab active={mode === 'organized'} onClick={() => setMode('organized')}>
          AI organized
        </ViewTab>
      </div>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {mode === 'chronological' ? (
          <ConversationFeed
            messages={messages}
            activeMessageId={playerState.activeMessageId}
            onPlayFrom={playFrom}
          />
        ) : (
          <OrganizedFeed
            messages={messages}
            activeMessageId={playerState.activeMessageId}
          />
        )}

        <DebugPanel
          messages={messages}
          playerState={playerState}
          replyDebugLog={replyDebugLog}
        />
      </main>

      {/* ── Record bar ── */}
      <footer className="shrink-0 px-4 py-4 border-t border-gray-100 flex items-center justify-center gap-6">
        <Recorder onRecorded={addRecording} />
      </footer>

    </div>
  )
}

function ViewTab({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm transition-colors ${
        active ? 'border-b-2 border-gray-900 text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  )
}
