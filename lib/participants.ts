export interface Participant {
  id: string
  name: string
  initial: string
  color: string  // tailwind bg class for avatar in legacy/debug components
  voiceProfile: {
    baseFreq: number    // fundamental pitch (Hz)
    syllableRate: number // syllables per second
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
  chloe: {
    id: 'chloe',
    name: 'Chloe',
    initial: 'C',
    color: 'bg-violet-400',
    voiceProfile: { baseFreq: 262, syllableRate: 4.8, gainPeak: 0.27 },
  },
  maria: {
    id: 'maria',
    name: 'Maria',
    initial: 'M',
    color: 'bg-blue-400',
    voiceProfile: { baseFreq: 220, syllableRate: 3.9, gainPeak: 0.25 },
  },
  sarah: {
    id: 'sarah',
    name: 'Sarah',
    initial: 'S',
    color: 'bg-orange-300',
    voiceProfile: { baseFreq: 240, syllableRate: 4.3, gainPeak: 0.26 },
  },
  lainey: {
    id: 'lainey',
    name: 'Lainey',
    initial: 'L',
    color: 'bg-green-400',
    voiceProfile: { baseFreq: 205, syllableRate: 4.1, gainPeak: 0.24 },
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
