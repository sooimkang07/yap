import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Avatar from "@/components/Avatar";
import ConversationView from "@/components/ConversationView";
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
      <ConversationView conversation={conversation} />
    </>
  );
}

export function generateStaticParams() {
  return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];
}
