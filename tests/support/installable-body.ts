// Two independently declared program groups share local object names to expose routing mistakes.
import { Type } from "@sinclair/typebox";
import { programAct, DESERT_CONTRACT, type LocalProgram } from "../../src/tools/installable/program.ts";
import { defineMessage } from "../../src/fields/messages.ts";
export const sampleDefinition = {
  id: "notes",
  version: "1.0.0",
  desert: DESERT_CONTRACT,
  facts: [{ kind: "notes/added", schema: Type.Object({ value: Type.Number() }) }],
  initial: () => ({ count: 0 }),
} as const;
export type Sample = LocalProgram<typeof sampleDefinition & { code: readonly [string] }>;
const skill = defineMessage({
  id: "fixture.installable.skill",
  kind: "skill",
  parameters: Type.Object({}),
  texts: { en: "Take notes with the program's actions.", es: "Anotá con las acciones del programa." },
});
const words = {
  name: "Notas",
  key: "n",
  listed: "Notas",
  empty: "Sin notas",
  reads: {},
  presents: [{ title: "Nota", empty: "Sin datos", reads: { count: "Cantidad" } }],
};
function action(on: "tool" | "thing") {
  return programAct<Sample, ReturnType<typeof Type.Object>>({
    name: "anotar",
    enter: "anotar",
    purpose: "guardar una nota",
    key: "a",
    undoable: true,
    on,
    input: Type.Object({}),
    run: (_input, ctx) => {
      if (Object.keys(ctx.state.tools).join() !== "own") throw new Error("Leaked another program state");
      return {
        status: "accepted",
        text: "Anotada",
        effects: [
          {
            layer: "program",
            kind: "notes/added",
            data: { value: ctx.state.tools.own.count + 1 },
            by: ctx.by,
            cause: [],
          },
        ],
      };
    },
    cases: [
      {
        promise: "Notes once",
        input: {},
        ...(on === "thing" ? { on: "same" } : {}),
        then: { says: "Anotada", facts: [{ kind: "notes/added", data: { value: 1 } }] },
      },
    ],
  });
}
const group = {
  purpose: "Guardar notas",
  words: words,
  acts: { add: action("tool"), edit: action("thing") },
  targets: () => ["same", "a/b#c"],
  view: (state: import("../../src/tools/tool-contract.ts").State<Sample>, target: string) =>
    ["same", "a/b#c"].includes(target)
      ? JSON.stringify({ count: state.tools.own.count })
      : ["same", "a/b#c"].map(id => JSON.stringify({ id, text: id })).join("\n"),
  summary: () => "Notas guardadas",
};
export const sampleBody = {
  purpose: "Guardar notas",
  words: words,
  skill,
  tools: { personal: group, shared: { ...group, words: { ...words, name: "Compartidas", key: "c" } } },
  fold: (own: Sample["tools"]["own"], event: import("../../src/journal/vocabulary.ts").Event<Sample["fact"]>) =>
    event.layer === "program" ? { count: event.data.value } : own,
  summary: () => "Dos carpetas",
};
