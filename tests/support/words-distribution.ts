// Two installable programs keep human names distinct from every program and tool path.
import { defineProgram, programAct, Type, type LocalProgram } from "../../src/tools/installable/program.ts";
import { compose } from "../../src/runtime/distributions/compose.ts";
import { sampleMetadata, sampleBody, sampleOptions } from "./installable-program.ts";
const group = sampleBody.tools.personal;
const personal = {
  ...group,
  words: { ...group.words, name: "Personales" },
  view: (state: Parameters<typeof group.view>[0], target: string) =>
    ["same", "a/b#c"].includes(target)
      ? group.view(state, target)
      : JSON.stringify({ id: "same", text: "Nota de Lucía" }),
};
const notes = defineProgram(sampleMetadata, {
  ...sampleBody,
  tools: { personal, shared: { ...personal, words: { ...personal.words, name: "Compartidas" } } },
  summary: state => (state.tools.own.count === 1 ? "1 nota" : `${state.tools.own.count} notas`),
});
const conversationMetadata = { ...sampleMetadata, id: "conversation", facts: [] } as const;
const input = Type.Object({});
const speak = programAct<LocalProgram<typeof conversationMetadata>, typeof input>({
  name: "decir",
  enter: "decir",
  purpose: "compartir un mensaje",
  key: "d",
  on: "tool",
  undoable: true,
  input,
  run: () => ({ status: "accepted", text: "Dicho · Mensaje", effects: [] }),
  cases: [{ promise: "Comparte un mensaje", input: {}, then: { says: "Dicho · Mensaje", facts: [] } }],
});
const conversation = defineProgram(conversationMetadata, {
  ...sampleBody,
  words: { ...sampleBody.words, name: "Conversación", key: "c" },
  tools: { dialogo: { ...personal, words: { ...personal.words, name: "Diálogo" }, acts: { speak } } },
});
export const wordsDistribution = compose({ ...sampleOptions, programs: [notes, conversation] });
