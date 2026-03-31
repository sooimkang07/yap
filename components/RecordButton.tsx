"use client";

import { useState } from "react";

export default function RecordButton() {
  const [recording, setRecording] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onPointerDown={() => setRecording(true)}
        onPointerUp={() => setRecording(false)}
        onPointerLeave={() => setRecording(false)}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-150 ${
          recording
            ? "bg-red-500 scale-110 shadow-lg shadow-red-200"
            : "bg-gray-900 hover:bg-gray-700"
        }`}
        aria-label={recording ? "Recording…" : "Hold to record"}
      >
        <MicIcon className="text-white" />
      </button>
      <span className="text-xs text-gray-400">
        {recording ? "Recording…" : "Hold to record"}
      </span>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
