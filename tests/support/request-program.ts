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
    { nombre: "notes/sent", forma: requestInput },
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
/** A line that leaves the house: the act the supervisor reviews before it runs. */
const send = programAct<Notes, typeof requestInput>({
  name: "send",
  enter: "send",
  purpose: "send a note out of the house",
  key: "s",
  undoable: true,
  on: "tool",
  reach: "world",
  input: requestInput,
  run: (input, ctx) => ({
    status: "accepted",
    text: "Sent",
    effects: [{ layer: "program", kind: "notes/sent", data: input, by: ctx.by, cause: [] }],
  }),
  cases: [
    {
      promise: "Sends the text",
      input: { body: "Out" },
      then: { says: "Sent", facts: [{ kind: "notes/sent", data: { body: "Out" } }] },
    },
  ],
});
export const requestKit = [{ tool: "notes", acts: ["personal/add"] }];
export const sendKit = [{ tool: "notes", acts: ["outbox/send"] }];
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
      outbox: {
        purpose: "Send notes out",
        palabras: { ...sampleBody.palabras, name: "Outbox", key: "o" },
        acts: { send },
        targets: () => [],
        view: () => "Outbox",
        summary: () => "Outbox",
      },
    },
    plegar: (own, event) =>
      event.layer === "program" && event.kind !== "notes/sent" ? { notes: [...own.notes, event.data.body] } : own,
    summary: () => "Notes",
    mindCases: [{ id: "request", scenes }],
  });
}
