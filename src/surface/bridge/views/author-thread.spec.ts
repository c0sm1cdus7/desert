import { expect, it } from "vitest";
import type { Conversation, Said, Tool } from "../../contract/shown-tool.ts";
import { authorThread } from "./author-thread.ts";
import { talkBody, startTalk } from "../../session/talk.ts";
it("nombra hilos de objetos, conserva el foco y relee los nombres sin mutar los mensajes", () => {
  let name = "Lucía";
  const message: Said = {
    id: "m1",
    who: [
      { text: "lucia", tone: "t1", bold: true },
      { text: " · equipo · 10:00", tone: "t3" },
    ],
    text: "lucia",
    quote: "Una cita ya escrita",
  };
  const conversation: Conversation = {
    said: () => [message],
    live: () => null,
    send: () => Promise.resolve(undefined),
    open: () => ({ title: "Adjunto", lines: [] }),
  };
  const source: Tool = {
    id: "chat",
    name: "Hilo",
    place: { key: "h", section: "tools" },
    acts: {},
    summary: () => "",
    view: () => [],
    conversationAt: target => (target === "chat/1" ? conversation : undefined),
  };
  const tool = authorThread(source, actor => (actor === "lucia" ? name : actor));
  const shown = tool.conversationAt?.("chat/1");
  if (!shown) throw new Error("Missing conversation");
  expect(tool.conversationAt?.("chat/missing")).toBeUndefined();
  expect(shown.said()[0]).toBe(shown.said()[0]);
  expect(shown.said()[0]).toEqual({ ...message, who: [{ text: "Lucía", tone: "t1", bold: true }, message.who?.[1]] });
  const body = talkBody({ ...startTalk("chat", "chat/1"), at: 0 }, shown);
  expect(body.kind === "thread" && body.events[0]?.selected).toBe(true);
  name = "Lucía Gómez";
  expect(shown.said()[0]?.who?.[0]?.text).toBe(name);
  expect(message.who?.[0]?.text).toBe("lucia");
  expect(shown.said()[0]?.text).toBe("lucia");
  expect(shown.said()[0]?.quote).toBe("Una cita ya escrita");
});
