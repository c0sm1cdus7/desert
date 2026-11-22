// The tools the contract specs walk, fresh each time: a conversation with an attachment, and the rules tool.
import type { Tool } from "../../src/surface/contract/shown-tool.ts";
import { rulesTool, seed } from "./surface-rules.ts";

const conversationTool = (): Tool => {
  const said = [
    { id: "a", who: [{ text: "Vos", tone: "t1" as const }], text: "Hola" },
    {
      id: "b",
      who: [{ text: "Nora", tone: "being" as const }],
      text: "Te dejé esto.",
      attachments: [{ id: "doc", title: "notas.md", detail: "archivo" }],
    },
  ];
  return {
    id: "talk",
    name: "Comunicador",
    place: { key: "c", section: "tools" },
    summary: () => "1 sin leer",
    view: () => [],
    acts: {},
    conversation: {
      said: () => said,
      live: () => null,
      send: text => {
        said.push({ id: `m${said.length}`, who: [{ text: "Vos", tone: "t1" }], text });
        return Promise.resolve(undefined);
      },
      open: () => ({ title: "notas.md", detail: "archivo", lines: [[{ text: "Una nota", tone: "t1" }]] }),
    },
  };
};
/** A new set of tools, so one walked path never sees what another one wrote. */
export const fresh = (): readonly Tool[] => [conversationTool(), rulesTool(seed())];
