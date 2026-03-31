import Link from "next/link";
import type { Conversation } from "@/types";
import { getOtherParticipant, formatDuration, formatRelativeTime } from "@/lib/mock";
import Avatar from "./Avatar";

interface ConversationCardProps {
  conversation: Conversation;
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  const other = getOtherParticipant(conversation);
  const last = conversation.messages[conversation.messages.length - 1];
  const unread = conversation.messages.filter(
    (m) => m.senderId !== "me" && !m.listened
  ).length;

  return (
    <Link href={`/conversation/${conversation.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
        <div className="relative">
          <Avatar label={other.avatar} size="lg" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium">
              {unread}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className={`text-sm ${unread > 0 ? "font-semibold" : "font-normal"}`}>
              {other.name}
            </span>
            <span className="text-xs text-gray-400 shrink-0 ml-2">
              {formatRelativeTime(conversation.lastActivity)}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MicSmall />
            <span className="text-xs text-gray-500 truncate">
              {last.senderId === "me" ? "You · " : ""}
              {formatDuration(last.duration)}
              {" · "}
              {conversation.messages.length} messages
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MicSmall() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400 shrink-0"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
