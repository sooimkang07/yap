import type { VoiceMessage, MessageNode } from "@/types";

export function buildTree(messages: VoiceMessage[]): MessageNode[] {
  const map = new Map<string, MessageNode>();

  for (const msg of messages) {
    map.set(msg.id, { message: msg, children: [] });
  }

  const roots: MessageNode[] = [];

  for (const msg of messages) {
    const node = map.get(msg.id)!;
    if (msg.replyToId && map.has(msg.replyToId)) {
      map.get(msg.replyToId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
