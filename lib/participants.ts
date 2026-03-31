export interface Participant {
  id: string
  name: string
  initial: string
  color: string  // tailwind bg class for avatar
  voiceProfile: {
    baseFreq: number    // fundamental pitch (Hz) — higher = higher-pitched voice
    syllableRate: number // syllables per second — higher = faster speaker
    gainPeak: number    // amplitude 0–1
  }
}

export const PARTICIPANTS: Record<string, Participant> = {
  me: {
    id: 'me',
    name: 'You',
    initial: 'Y',
    color: 'bg-gray-900',
    voiceProfile: { baseFreq: 175, syllableRate: 4.2, gainPeak: 0.24 },
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    initial: 'A',
    color: 'bg-blue-600',
    voiceProfile: { baseFreq: 148, syllableRate: 3.5, gainPeak: 0.22 },
  },
  priya: {
    id: 'priya',
    name: 'Priya',
    initial: 'P',
    color: 'bg-violet-600',
    voiceProfile: { baseFreq: 248, syllableRate: 4.5, gainPeak: 0.28 },
  },
  dani: {
    id: 'dani',
    name: 'Dani',
    initial: 'D',
    color: 'bg-emerald-600',
    voiceProfile: { baseFreq: 195, syllableRate: 4.0, gainPeak: 0.25 },
  },
}

export function getParticipant(id: string): Participant {
  return (
    PARTICIPANTS[id] ?? {
      id,
      name: id,
      initial: id[0]?.toUpperCase() ?? '?',
      color: 'bg-gray-400',
      voiceProfile: { baseFreq: 200, syllableRate: 4.0, gainPeak: 0.24 },
    }
  )
}
