// A minimal talk program: anyone says a line to one reader or, comma-separated, a group; minds read it as a message.
import { Value } from "@sinclair/typebox/value";
import { text } from "../../src/fields/fields.ts";
import { object } from "../../src/fields/visible-text.ts";
import { defineProgram, programAct, type LocalProgram } from "../../src/tools/installable/program.ts";
import { sampleBody, sampleMetadata } from "./installable-program.ts";
export const talkInput = object({
  to: text("To", "Who reads it"),
  text: { ...text("Line", "What to say"), verbatim: true },
});
const metadata = {
  ...sampleMetadata,
  id: "talk",
  code: [import.meta.filename],
  facts: [{ kind: "talk/said", schema: talkInput }],
  initial: (): { lines: { by: string; to: string; text: string }[] } => ({ lines: [] }),
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
export const talkProgram = defineProgram(metadata, {
  purpose: "Talk in one thread",
  skill: sampleBody.skill,
  words: { ...sampleBody.words, name: "Talk", key: "k" },
  tools: {
    thread: {
      purpose: "Say lines to one reader",
      words: { ...sampleBody.words, name: "Thread", key: "k" },
      acts: { say },
      targets: () => [],
      view: state => JSON.stringify(state.tools.own.lines),
      summary: () => "Thread",
    },
  },
  fold: (own, event) => (event.layer === "program" ? { lines: [...own.lines, { by: event.by, ...event.data }] } : own),
  summary: () => "Talk",
  messages: {
    read: event =>
      event.layer === "program" && event.kind === "talk/said" && Value.Check(talkInput, event.data)
        ? { text: event.data.text, to: event.data.to.split(","), by: event.by }
        : undefined,
    acts: ["thread/say"],
  },
});
