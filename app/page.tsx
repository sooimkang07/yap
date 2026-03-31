import Header from "@/components/Header";
import ConversationItem from "@/components/ConversationItem";
import { conversations } from "@/lib/mock";

export default function Home() {
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  return (
    <>
      <Header title="Yap" />
      <main className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {sorted.map((convo) => (
          <ConversationItem key={convo.id} conversation={convo} />
        ))}
      </main>
    </>
  );
}
