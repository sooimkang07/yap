"use client";

import { useState, useRef } from "react";
import type { VoiceMessage as VoiceMessageType } from "@/types";
import { formatDuration, formatRelativeTime } from "@/lib/mock";
import Waveform from "./Waveform";

interface VoiceMessageProps {
  message: VoiceMessageType;
  mine: boolean;
}

export default function VoiceMessage({ message, mine }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function togglePlay() {
    if (playing) {
      stop();
    } else {
      play();
    }
  }

  function play() {
    setPlaying(true);
    const totalMs = message.duration * 1000;
    const startTime = Date.now() - progress * totalMs;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const next = elapsed / totalMs;
      if (next >= 1) {
        stop();
        setProgress(0);
      } else {
        setProgress(next);
      }
    }, 50);
  }

  function stop() {
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  return (
    <div className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex flex-col gap-1 max-w-[75%] ${mine ? "items-end" : "items-start"}`}
      >
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${
            mine ? "bg-gray-900 text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
          }`}
        >
          <button
            onClick={togglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              mine ? "bg-white/20 hover:bg-white/30" : "bg-gray-900/10 hover:bg-gray-900/20"
            } transition-colors`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <PauseIcon className={mine ? "text-white" : "text-gray-900"} />
            ) : (
              <PlayIcon className={mine ? "text-white" : "text-gray-900"} />
            )}
          </button>

          <div className="flex flex-col gap-1 min-w-[120px]">
            <Waveform bars={message.waveform} progress={progress} mine={mine} />
            <span className={`text-xs ${mine ? "text-white/60" : "text-gray-400"}`}>
              {formatDuration(message.duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">
            {formatRelativeTime(message.createdAt)}
          </span>
          {!mine && !message.listened && (
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          )}
        </div>
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className}
    >
      <path d="M2 1.5l9 4.5-9 4.5V1.5z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className}
    >
      <rect x="2" y="1" width="3" height="10" rx="1" />
      <rect x="7" y="1" width="3" height="10" rx="1" />
    </svg>
  );
}
