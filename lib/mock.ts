import type { Conversation, User } from "@/types";

export const currentUser: User = {
  id: "me",
  name: "You",
  avatar: "Y",
};

// Deterministic waveform so server/client values match (no hydration mismatch)
function wave(seed: string, n = 40): number[] {
  return Array.from({ length: n }, (_, i) => {
    const x = Math.sin(seed.charCodeAt(i % seed.length) * (i + 1)) * 10000;
    return Math.abs(x - Math.floor(x)) * 0.8 + 0.1;
  });
}

const t = (minsAgo: number) =>
  new Date(Date.now() - minsAgo * 60 * 1000).toISOString();

export const conversations: Conversation[] = [
  // ── Conversation 1: Mia Chen — rich threaded thread ──────────────────────
  {
    id: "1",
    participants: [currentUser, { id: "u2", name: "Mia Chen", avatar: "M" }],
    lastActivity: t(4),
    messages: [
      // root thread A: weekend trip
      {
        id: "m1",
        senderId: "u2",
        duration: 18,
        createdAt: t(180),
        listened: true,
        waveform: wave("m1"),
        // no replyToId — root
      },
      // me replies to m1 — Saturday plans
      {
        id: "m2",
        senderId: "me",
        duration: 24,
        createdAt: t(150),
        listened: true,
        waveform: wave("m2"),
        replyToId: "m1",
      },
      // me also replies to m1 — train schedule (sibling of m2)
      {
        id: "m3",
        senderId: "me",
        duration: 14,
        createdAt: t(145),
        listened: true,
        waveform: wave("m3"),
        replyToId: "m1",
      },
      // Mia replies to m2 — departure time
      {
        id: "m4",
        senderId: "u2",
        duration: 20,
        createdAt: t(105),
        listened: true,
        waveform: wave("m4"),
        replyToId: "m2",
      },
      // me replies to m3 — confirms train
      {
        id: "m5",
        senderId: "me",
        duration: 11,
        createdAt: t(90),
        listened: true,
        waveform: wave("m5"),
        replyToId: "m3",
      },
      // root thread B: hotel
      {
        id: "m6",
        senderId: "me",
        duration: 16,
        createdAt: t(45),
        listened: true,
        waveform: wave("m6"),
        // no replyToId — new root
      },
      // Mia replies to m6 — hotel confirmed
      {
        id: "m7",
        senderId: "u2",
        duration: 29,
        createdAt: t(20),
        listened: true,
        waveform: wave("m7"),
        replyToId: "m6",
      },
      // Mia late reply back on m4 thread
      {
        id: "m8",
        senderId: "u2",
        duration: 9,
        createdAt: t(4),
        listened: false,
        waveform: wave("m8"),
        replyToId: "m4",
      },
    ],
  },

  // ── Conversation 2: Rafi Sousa ────────────────────────────────────────────
  {
    id: "2",
    participants: [currentUser, { id: "u3", name: "Rafi Sousa", avatar: "R" }],
    lastActivity: t(120),
    messages: [
      {
        id: "r1",
        senderId: "u3",
        duration: 38,
        createdAt: t(180),
        listened: true,
        waveform: wave("r1"),
      },
      {
        id: "r2",
        senderId: "me",
        duration: 52,
        createdAt: t(120),
        listened: true,
        waveform: wave("r2"),
        replyToId: "r1",
      },
    ],
  },

  // ── Conversation 3: Selin Yıldız ─────────────────────────────────────────
  {
    id: "3",
    participants: [currentUser, { id: "u4", name: "Selin Yıldız", avatar: "S" }],
    lastActivity: t(1500),
    messages: [
      {
        id: "s1",
        senderId: "u4",
        duration: 21,
        createdAt: t(1500),
        listened: false,
        waveform: wave("s1"),
      },
    ],
  },

  // ── Conversation 4: Kofi Agyei ────────────────────────────────────────────
  {
    id: "4",
    participants: [currentUser, { id: "u5", name: "Kofi Agyei", avatar: "K" }],
    lastActivity: t(2880),
    messages: [
      {
        id: "k1",
        senderId: "me",
        duration: 45,
        createdAt: t(3000),
        listened: true,
        waveform: wave("k1"),
      },
      {
        id: "k2",
        senderId: "u5",
        duration: 33,
        createdAt: t(2880),
        listened: true,
        waveform: wave("k2"),
        replyToId: "k1",
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
