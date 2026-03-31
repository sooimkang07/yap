export interface Participant {
  id: string
  name: string
  initial: string
}

export const PARTICIPANTS: Record<string, Participant> = {
  me:    { id: 'me',    name: 'You',   initial: 'Y' },
  alex:  { id: 'alex',  name: 'Alex',  initial: 'A' },
  priya: { id: 'priya', name: 'Priya', initial: 'P' },
  dani:  { id: 'dani',  name: 'Dani',  initial: 'D' },
}

export function getParticipant(id: string): Participant {
  return PARTICIPANTS[id] ?? { id, name: id, initial: id[0]?.toUpperCase() ?? '?' }
}
