'use client'

import { useState } from 'react'
import { useConversation } from '@/hooks/useConversation'
import ConversationFeed from '@/components/ConversationFeed'
import OrganizedFeed from '@/components/OrganizedFeed'
import Recorder from '@/components/Recorder'
import DebugPanel from '@/components/DebugPanel'

type ViewMode = 'chronological' | 'organized'

export default function DemoPage() {
  const { messages, addRecording } = useConversation()
  const [mode, setMode] = useState<ViewMode>('chronological')

  return (
    <div className="mx-auto max-w-md min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h1 className="text-sm font-semibold">Demo conversation</h1>
        <div className="flex items-center gap-1 text-sm">
          <ViewButton active={mode === 'chronological'} onClick={() => setMode('chronological')}>
            Chronological
          </ViewButton>
          <span className="text-gray-200 select-none">|</span>
          <ViewButton active={mode === 'organized'} onClick={() => setMode('organized')}>
            AI organized
          </ViewButton>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {mode === 'chronological' ? (
          <ConversationFeed messages={messages} />
        ) : (
          <OrganizedFeed messages={messages} />
        )}

        <DebugPanel messages={messages} />
      </main>

      {/* Record bar */}
      <footer className="shrink-0 px-4 py-5 border-t border-gray-100 flex items-center justify-center">
        <Recorder onRecorded={addRecording} />
      </footer>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm transition-colors ${
        active ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  )
}
