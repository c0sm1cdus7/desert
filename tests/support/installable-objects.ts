// An installable notes program exposes author-only object actions in one or two folders.
import { defineProgram, programAct, type ProgramAct, type ProgramGroup } from "../../src/tools/installable/program.ts";
import { compose } from "../../src/runtime/distributions/compose.ts";
import { sampleBody, sampleMetadata, sampleOptions, type Sample } from "./installable-program.ts";

export const authorOnly = "solo la autora";
export const authorOf = (target: string) => (target === "same" ? "beto" : "carla");
const base = sampleBody.tools.personal;
function action(on: "tool" | "thing"): ProgramAct<Sample> {
  const original = on === "tool" ? base.acts.add : base.acts.edit;
  const text = on === "tool" ? "Anotada · Nota" : "Editada · Nota";
  return programAct<Sample, typeof original.input>({
    ...original,
    name: on === "tool" ? "note" : "edit",
    enter: on === "tool" ? "note" : "edit",
    key: on === "tool" ? "a" : "e",
    refuses: on === "tool" ? [] : [authorOnly],
    ...(on === "thing" ? { offered: (state, target) => (state.by === authorOf(target) ? undefined : authorOnly) } : {}),
    run: async (input, ctx) => ({ ...(await original.run(input, ctx)), text }),
    cases: [
      {
        promise: on === "tool" ? "Notes a note" : "The author edits her note",
        input: {},
        ...(on === "thing" ? { on: "same", by: "beto" } : {}),
        then: { says: text, facts: [{ kind: "notes/added", data: { value: 1 } }] },
      },
      ...(on === "thing"
        ? [{ promise: "Someone else does not edit", input: {}, on: "same", by: "ana", then: { refused: authorOnly } }]
        : []),
    ],
  });
}
const group: ProgramGroup<Sample> = { ...base, acts: { edit: action("thing"), note: action("tool") } };
export function objectDistribution(two: boolean, shortcut = false) {
  const program = defineProgram(sampleMetadata, {
    ...sampleBody,
    tools: {
      notes: group,
      ...(two ? { shared: { ...group, words: sampleBody.tools.shared.words } } : {}),
    },
  });
  return compose({ ...sampleOptions, programs: [program], singleToolShortcut: shortcut });
}
