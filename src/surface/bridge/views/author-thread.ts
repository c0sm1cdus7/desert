// Shows the author in thread headers and keeps their tones, times, messages and destinations.
import type { Conversation, Said, Tool } from "../../contract/shown-tool.ts";
/** The first header span names the author; later spans carry device, time and delivery state. */
export function authorThread(tool: Tool, name: (actor: string) => string): Tool {
  const wrap = (conversation: Conversation): Conversation => {
    const named = new WeakMap<Said, Said>();
    return {
      ...conversation,
      said: () =>
        conversation.said().map(item => {
          const first = item.who?.[0];
          if (!first) return item;
          const text = name(first.text);
          if (text === first.text) return item;
          const cached = named.get(item);
          if (cached?.who?.[0]?.text === text) return cached;
          const shown = { ...item, who: [{ ...first, text }, ...item.who.slice(1)] };
          named.set(item, shown);
          return shown;
        }),
    };
  };
  const conversations = new WeakMap<Conversation, Conversation>();
  const shown = (conversation: Conversation) => {
    const existing = conversations.get(conversation);
    if (existing) return existing;
    const result = wrap(conversation);
    conversations.set(conversation, result);
    return result;
  };
  return {
    ...tool,
    ...(tool.conversation ? { conversation: shown(tool.conversation) } : {}),
    ...(tool.conversationAt
      ? {
          conversationAt: (target: string) => {
            const conversation = tool.conversationAt?.(target);
            return conversation ? shown(conversation) : undefined;
          },
        }
      : {}),
  };
}
