import type { Conversation, User } from "@/types";

export const currentUser: User = {
  id: "me",
  name: "You",
  avatar: "Y",
};

const seed = (n: number) =>
  Array.from({ length: n }, () => Math.random() * 0.8 + 0.1);

export const conversations: Conversation[] = [
  {
    id: "1",
    participants: [
      currentUser,
      { id: "2", name: "Mia Chen", avatar: "M" },
    ],
    lastActivity: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    messages: [
      {
        id: "m1",
        senderId: "2",
        duration: 14,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        listened: true,
        waveform: seed(40),
      },
      {
        id: "m2",
        senderId: "me",
        duration: 27,
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        listened: true,
        waveform: seed(40),
      },
      {
        id: "m3",
        senderId: "2",
        duration: 9,
        createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        listened: false,
        waveform: seed(40),
      },
    ],
  },
  {
    id: "2",
    participants: [
      currentUser,
      { id: "3", name: "Rafi Sousa", avatar: "R" },
    ],
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    messages: [
      {
        id: "m4",
        senderId: "3",
        duration: 38,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        listened: true,
        waveform: seed(40),
      },
      {
        id: "m5",
        senderId: "me",
        duration: 52,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        listened: true,
        waveform: seed(40),
      },
    ],
  },
  {
    id: "3",
    participants: [
      currentUser,
      { id: "4", name: "Selin Yıldız", avatar: "S" },
    ],
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    messages: [
      {
        id: "m6",
        senderId: "4",
        duration: 21,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
        listened: false,
        waveform: seed(40),
      },
    ],
  },
  {
    id: "4",
    participants: [
      currentUser,
      { id: "5", name: "Kofi Agyei", avatar: "K" },
    ],
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    messages: [
      {
        id: "m7",
        senderId: "me",
        duration: 45,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
        listened: true,
        waveform: seed(40),
      },
      {
        id: "m8",
        senderId: "5",
        duration: 33,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        listened: true,
        waveform: seed(40),
      },
    ],
  },
];

export function getConversation(id: string): Conversation | undefined {
  return conversations.find((c) => c.id === id);
}

export function getOtherParticipant(conversation: Conversation, myId = "me") {
  return conversation.participants.find((p) => p.id !== myId)!;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
