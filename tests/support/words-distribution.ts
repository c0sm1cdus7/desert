// Two installable programs keep human names distinct from every program and tool path.
import { programa, programAct, Type, type LocalProgram } from "../../src/tools/installable/program.ts";
import { componer } from "../../src/runtime/distributions/compose.ts";
import { sampleMetadata, sampleBody, sampleOptions } from "./installable-program.ts";
const group = sampleBody.herramientas.personal;
const personal = {
  ...group,
  palabras: { ...group.palabras, name: "Personales" },
  view: (state: Parameters<typeof group.view>[0], target: string) =>
    ["same", "a/b#c"].includes(target)
      ? group.view(state, target)
      : JSON.stringify({ id: "same", text: "Nota de Lucía" }),
};
const notes = programa(sampleMetadata, {
  ...sampleBody,
  herramientas: { personal, shared: { ...personal, palabras: { ...personal.palabras, name: "Compartidas" } } },
  summary: state => (state.tools.own.count === 1 ? "1 nota" : `${state.tools.own.count} notas`),
});
const conversationMetadata = { ...sampleMetadata, id: "conversacion", hechos: [] } as const;
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
const conversation = programa(conversationMetadata, {
  ...sampleBody,
  palabras: { ...sampleBody.palabras, name: "Conversación", key: "c" },
  herramientas: { dialogo: { ...personal, palabras: { ...personal.palabras, name: "Diálogo" }, acts: { speak } } },
});
export const wordsDistribution = componer({ ...sampleOptions, programas: [notes, conversation] });
