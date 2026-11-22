// A minimal talk program: anyone says a line to one reader or, comma-separated, a group; minds read it as a message.
import { Value } from "@sinclair/typebox/value";
import { text } from "../../src/fields/fields.ts";
import { object } from "../../src/fields/visible-text.ts";
import { programa, programAct, type LocalProgram } from "../../src/tools/installable/program.ts";
import { sampleBody, sampleMetadata } from "./installable-program.ts";
export const talkInput = object({
  to: text("To", "Who reads it"),
  text: { ...text("Line", "What to say"), verbatim: true },
});
const metadata = {
  ...sampleMetadata,
  id: "talk",
  codigo: [import.meta.filename],
  hechos: [{ nombre: "talk/said", forma: talkInput }],
  inicial: (): { lines: { by: string; to: string; text: string }[] } => ({ lines: [] }),
} as const;
type Talk = LocalProgram<typeof metadata>;
const say = programAct<Talk, typeof talkInput>({
  name: "say",
  enter: "say",
  purpose: "say a line in the thread",
  key: "s",
  undoable: true,
  on: "tool",
  input: talkInput,
  run: (input, ctx) => ({
    status: "accepted",
    text: "Said",
    effects: [{ layer: "program", kind: "talk/said", data: input, by: ctx.by, cause: [] }],
  }),
  cases: [
    {
      promise: "Keeps the line for its reader",
      input: { to: "ana", text: "Hello" },
      then: { says: "Said", facts: [{ kind: "talk/said", data: { to: "ana", text: "Hello" } }] },
    },
  ],
});
/** The act a consciousness says lines with, and its kit entry. */
export const talkAct = { act: "thread/say", target: "talk/thread" } as const;
export const talkKit = { tool: "talk", acts: ["thread/say"] };
export const talkProgram = programa(metadata, {
  purpose: "Talk in one thread",
  skill: sampleBody.skill,
  palabras: { ...sampleBody.palabras, name: "Talk", key: "k" },
  herramientas: {
    thread: {
      purpose: "Say lines to one reader",
      palabras: { ...sampleBody.palabras, name: "Thread", key: "k" },
      acts: { say },
      targets: () => [],
      view: state => JSON.stringify(state.tools.own.lines),
      summary: () => "Thread",
    },
  },
  plegar: (own, event) =>
    event.layer === "program" ? { lines: [...own.lines, { by: event.by, ...event.data }] } : own,
  summary: () => "Talk",
  mensajes: {
    leer: event =>
      event.layer === "program" && event.kind === "talk/said" && Value.Check(talkInput, event.data)
        ? { text: event.data.text, to: event.data.to.split(","), by: event.by }
        : undefined,
    actos: ["thread/say"],
  },
});
