// An installable notes program exposes author-only object actions in one or two folders.
import { programa, programAct, type ProgramAct, type ProgramGroup } from "../../src/tools/installable/program.ts";
import { componer } from "../../src/runtime/distributions/compose.ts";
import { sampleBody, sampleMetadata, sampleOptions, type Sample } from "./installable-program.ts";

export const authorOnly = "solo la autora";
export const authorOf = (target: string) => (target === "same" ? "beto" : "carla");
const base = sampleBody.herramientas.personal;
function action(on: "tool" | "thing"): ProgramAct<Sample> {
  const original = on === "tool" ? base.acts.add : base.acts.edit;
  const text = on === "tool" ? "Anotada · Nota" : "Editada · Nota";
  return programAct<Sample, typeof original.input>({
    ...original,
    name: on === "tool" ? "anotar" : "editar",
    enter: on === "tool" ? "anotar" : "editar",
    key: on === "tool" ? "a" : "e",
    refuses: on === "tool" ? [] : [authorOnly],
    ...(on === "thing" ? { offered: (state, target) => (state.by === authorOf(target) ? undefined : authorOnly) } : {}),
    run: async (input, ctx) => ({ ...(await original.run(input, ctx)), text }),
    cases: [
      {
        promise: on === "tool" ? "Anota una nota" : "La autora edita su nota",
        input: {},
        ...(on === "thing" ? { on: "same", by: "beto" } : {}),
        then: { says: text, facts: [{ kind: "notas/anotada", data: { value: 1 } }] },
      },
      ...(on === "thing"
        ? [{ promise: "Otra persona no edita", input: {}, on: "same", by: "ana", then: { refused: authorOnly } }]
        : []),
    ],
  });
}
const group: ProgramGroup<Sample> = { ...base, acts: { editar: action("thing"), anotar: action("tool") } };
export function objectDistribution(two: boolean, shortcut = false) {
  const program = programa(sampleMetadata, {
    ...sampleBody,
    herramientas: {
      notas: group,
      ...(two ? { shared: { ...group, palabras: sampleBody.herramientas.shared.palabras } } : {}),
    },
  });
  return componer({ ...sampleOptions, programas: [program], atajoUnaHerramienta: shortcut });
}
