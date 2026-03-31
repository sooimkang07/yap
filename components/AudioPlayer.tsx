'use client'

import { useState, useRef, useEffect } from 'react'
import { formatDuration } from '@/lib/utils'

interface AudioPlayerProps {
  url: string
  duration: number
  light?: boolean // white controls on dark background
}

export default function AudioPlayer({ url, duration, light = false }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    audio.ontimeupdate = () => {
      setProgress(audio.currentTime / (audio.duration || 1))
    }
    audio.onended = () => {
      setPlaying(false)
      setProgress(0)
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [url])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  const trackBg = light ? 'bg-white/30' : 'bg-gray-200'
  const trackFill = light ? 'bg-white' : 'bg-gray-900'
  const btnBg = light ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-900/10 hover:bg-gray-900/20'
  const timeColor = light ? 'text-white/60' : 'text-gray-400'

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${btnBg}`}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon light={light} /> : <PlayIcon light={light} />}
      </button>

      <div className={`flex-1 h-1 ${trackBg} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${trackFill} rounded-full transition-all duration-75`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span className={`text-xs tabular-nums shrink-0 ${timeColor}`}>
        {formatDuration(duration)}
      </span>
    </div>
  )
}

function PlayIcon({ light }: { light: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill={light ? 'white' : 'currentColor'}>
      <path d="M2 1l7 4-7 4V1z" />
    </svg>
  )
}

function PauseIcon({ light }: { light: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill={light ? 'white' : 'currentColor'}>
      <rect x="1" y="1" width="3" height="8" rx="1" />
      <rect x="6" y="1" width="3" height="8" rx="1" />
    </svg>
  )
}
