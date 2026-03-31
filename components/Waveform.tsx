"use client";

interface WaveformProps {
  bars: number[];
  progress: number; // 0–1
  mine: boolean;
}

export default function Waveform({ bars, progress, mine }: WaveformProps) {
  const filled = mine ? "bg-gray-900" : "bg-gray-900";
  const unfilled = mine ? "bg-gray-400" : "bg-gray-300";

  return (
    <div className="flex items-center gap-px h-8">
      {bars.map((h, i) => {
        const isPast = i / bars.length < progress;
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-colors ${isPast ? filled : unfilled}`}
            style={{ height: `${Math.max(h * 100, 12)}%` }}
          />
        );
      })}
    </div>
  );
}
