export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface VoiceMessage {
  id: string;
  senderId: string;
  duration: number; // seconds
  createdAt: string; // ISO string
  listened: boolean;
  waveform: number[]; // normalized 0–1 values
  replyToId?: string; // parent message id
}

export interface Conversation {
  id: string;
  participants: User[];
  messages: VoiceMessage[];
  lastActivity: string;
}

export interface MessageNode {
  message: VoiceMessage;
  children: MessageNode[];
}
