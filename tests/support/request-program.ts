// A sample notes program retains text fields and semantic checks through real mind journeys.
import { Type } from "@sinclair/typebox";
import { text, day, quantity } from "../../src/fields/fields.ts";
import { object } from "../../src/fields/visible-text.ts";
import { programa, programAct, type LocalProgram, type ProgramMindScene } from "../../src/tools/installable/program.ts";
import { sampleBody, sampleMetadata } from "./installable-program.ts";
export const requestInput = object({
  body: { ...text("Note", "What to remember"), verbatim: true },
  date: Type.Optional(day("Day")),
  amount: Type.Optional(quantity("Amount")),
});
const metadata = {
  ...sampleMetadata,
  id: "notes",
  codigo: [import.meta.filename],
  hechos: [
    { nombre: "notes/stored", forma: requestInput },
    { nombre: "notes/imported", forma: requestInput },
  ],
  inicial: (): { notes: string[] } => ({ notes: [] }),
} as const;
type Notes = LocalProgram<typeof metadata>;
const add = programAct<Notes, typeof requestInput>({
  name: "add",
  enter: "add",
  purpose: "remember a note",
  key: "a",
  undoable: true,
  on: "tool",
  input: requestInput,
  run: (input, ctx) => ({
    status: "accepted",
    text: "Saved",
    effects: [{ layer: "program", kind: "notes/stored", data: input, by: ctx.by, cause: [] }],
  }),
  cases: [
    {
      promise: "Stores the text",
      input: { body: "Remember" },
      then: { says: "Saved", facts: [{ kind: "notes/stored", data: { body: "Remember" } }] },
    },
  ],
});
export const requestKit = [{ tool: "notes", acts: ["personal/add"] }];
const bankScene: ProgramMindScene = {
  given: [],
  kit: requestKit,
  when: { act: "personal/add", target: "notes/personal", input: { body: "Bank note" } },
  check: events => events.some(e => e.layer === "house" && e.kind === "mind-turn-closed" && e.data.outcome === "done"),
};
export function requestProgram(
  scenes: readonly [ProgramMindScene, ProgramMindScene, ProgramMindScene] = [bankScene, bankScene, bankScene],
) {
  return programa(metadata, {
    purpose: "Remember notes",
    skill: sampleBody.skill,
    palabras: sampleBody.palabras,
    herramientas: {
      personal: {
        purpose: "Remember notes",
        palabras: sampleBody.palabras,
        acts: { add },
        targets: () => [],
        view: state => JSON.stringify(state.tools.own.notes),
        summary: () => "Notes",
      },
    },
    plegar: (own, event) => (event.layer === "program" ? { notes: [...own.notes, event.data.body] } : own),
    summary: () => "Notes",
    mindCases: [{ id: "request", scenes }],
  });
}
