// The tools the contract specs walk, fresh each time: a conversation with an attachment, and the rules tool.
import type { Intent } from "../../src/surface/contract/contract.ts";
import type { Tool } from "../../src/surface/contract/shown-tool.ts";
import { surfaceWalk, type Stop } from "../../src/checks/surface-walk.ts";
import { errandsTool } from "./surface-errands.ts";
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
    { id: "c", who: [{ text: "Nora", tone: "being" as const }], text: "Es la del martes.", nested: true },
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
export const fresh = (): readonly Tool[] => [conversationTool(), rulesTool(seed()), errandsTool()];
const key = (text: string): Intent => ({ kind: "type", text });
/** Every question of the errands act, one after the other, deeper than the walk goes before its cap: written by
 * hand, and replayed. Each prefix is a path, so each question is a screen. */
const answering: readonly Intent[] = [
  key("e"),
  key("n"),
  key(" "),
  { kind: "confirm" },
  { kind: "down" },
  { kind: "confirm" },
  { kind: "confirm" },
  key("x"),
  { kind: "confirm" },
  ...Array.from("0103202", key),
  key("6"),
  { kind: "confirm" },
];
const deeper = answering.map((_, at) => answering.slice(0, at + 1));
/** The walk every contract spec and the golden screens run: as a 200×60 terminal shows it, up to 300 screens, to
 * someone who reads the house in Spanish, as the tools' own words are. */
export const walked = (): Promise<readonly Stop[]> => surfaceWalk(fresh, 52, 300, deeper, "es");
