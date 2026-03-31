import { notFound } from "next/navigation";
import Header from "@/components/Header";
import VoiceMessage from "@/components/VoiceMessage";
import RecordButton from "@/components/RecordButton";
import Avatar from "@/components/Avatar";
import { getConversation, getOtherParticipant } from "@/lib/mock";

interface Props {
  params: { id: string };
}

export default function ConversationPage({ params }: Props) {
  const conversation = getConversation(params.id);
  if (!conversation) notFound();

  const other = getOtherParticipant(conversation);

  return (
    <>
      <Header
        title={other.name}
        back="/"
        right={<Avatar label={other.avatar} size="sm" />}
      />

      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {conversation.messages.map((msg) => (
          <VoiceMessage
            key={msg.id}
            message={msg}
            mine={msg.senderId === "me"}
          />
        ))}
      </main>

      <footer className="px-4 py-5 border-t border-gray-100 flex items-center justify-center">
        <RecordButton />
      </footer>
    </>
  );
}

export function generateStaticParams() {
  return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];
}
