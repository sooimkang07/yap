"use client";

import { useState } from "react";
import type { Conversation, MessageNode, User } from "@/types";
import { buildTree } from "@/lib/thread";
import VoiceMessage from "./VoiceMessage";
import RecordButton from "./RecordButton";

type ViewMode = "chronological" | "threaded";

interface ConversationViewProps {
  conversation: Conversation;
}

export default function ConversationView({ conversation }: ConversationViewProps) {
  const [mode, setMode] = useState<ViewMode>("chronological");

  const chronological = [...conversation.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const tree = buildTree(chronological);

  return (
    <>
      {/* Toggle */}
      <div className="flex border-b border-gray-100">
        <ToggleButton
          active={mode === "chronological"}
          onClick={() => setMode("chronological")}
        >
          Chronological
        </ToggleButton>
        <ToggleButton
          active={mode === "threaded"}
          onClick={() => setMode("threaded")}
        >
          AI organized
        </ToggleButton>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {mode === "chronological" ? (
          <div className="flex flex-col gap-4">
            {chronological.map((msg) => (
              <VoiceMessage
                key={msg.id}
                message={msg}
                mine={msg.senderId === "me"}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {tree.map((node) => (
              <ThreadNode
                key={node.message.id}
                node={node}
                depth={0}
                participants={conversation.participants}
              />
            ))}
          </div>
        )}
      </main>

      {/* Record bar */}
      <footer className="px-4 py-5 border-t border-gray-100 flex items-center justify-center">
        <RecordButton />
      </footer>
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm transition-colors ${
        active
          ? "border-b-2 border-gray-900 text-gray-900 font-medium"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

function ThreadNode({
  node,
  depth,
  participants,
}: {
  node: MessageNode;
  depth: number;
  participants: User[];
}) {
  const mine = node.message.senderId === "me";
  const sender = participants.find((p) => p.id === node.message.senderId);

  return (
    <div className={depth > 0 ? "ml-5 pl-3 border-l-2 border-gray-100" : ""}>
      <VoiceMessage
        message={node.message}
        mine={mine}
        senderName={depth > 0 ? (mine ? "You" : sender?.name) : undefined}
      />
      {node.children.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {node.children.map((child) => (
            <ThreadNode
              key={child.message.id}
              node={child}
              depth={depth + 1}
              participants={participants}
            />
          ))}
        </div>
      )}
    </div>
  );
}
