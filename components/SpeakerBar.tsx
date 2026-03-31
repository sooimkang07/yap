import { PARTICIPANTS } from '@/lib/participants'
import type { PlayerState } from '@/hooks/useConversationPlayer'

interface SpeakerBarProps {
  playerState: PlayerState
  audioReady: boolean
  onPlayAll: () => void
  onStop: () => void
}

export default function SpeakerBar({ playerState, audioReady, onPlayAll, onStop }: SpeakerBarProps) {
  const speakers = Object.values(PARTICIPANTS)

  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4">
      {/* Participant avatars */}
      <div className="flex items-center gap-2 flex-1">
        {speakers.map((p) => {
          const isActive = playerState.activeSpeakerId === p.id
          return (
            <div key={p.id} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white transition-all duration-200 ${p.color} ${
                  isActive
                    ? 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                    : playerState.isPlaying
                    ? 'opacity-30'
                    : 'opacity-70'
                }`}
              >
                {p.initial}
              </div>
              <span className={`text-[10px] transition-colors ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {p.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* Play / Stop control */}
      {!audioReady ? (
        <span className="text-xs text-gray-400">Generating audio…</span>
      ) : playerState.isPlaying ? (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1 transition-colors"
        >
          <span>■</span>
          <span>Stop</span>
        </button>
      ) : (
        <button
          onClick={onPlayAll}
          className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1 transition-colors"
        >
          <span>▶</span>
          <span>Play all</span>
        </button>
      )}
    </div>
  )
}
