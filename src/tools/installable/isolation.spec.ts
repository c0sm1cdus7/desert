import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { programa, type LocalProgram } from "./program.ts";
import { sampleProgram, sampleOptions, sampleBody } from "../../../tests/support/installable-program.ts";
import { componer, diagnostico, type DistributionOf } from "../../runtime/distributions/compose.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { startState, toolsStep } from "../../house/state.ts";
const metadata = {
  id: "counter",
  desert: 1,
  version: "1.0.0",
  codigo: [import.meta.filename],
  hechos: [{ nombre: "counter/added", forma: Type.Number() }],
  inicial: () => 20,
} as const;
type Counter = LocalProgram<typeof metadata>;
const counter = programa(metadata, {
  ...sampleBody,
  herramientas: {},
  palabras: { ...sampleBody.palabras, name: "Contador", key: "c" },
  plegar: (own: number, event: import("../../journal/vocabulary.ts").Event<Counter["fact"]>) =>
    event.layer === "program" ? own + event.data : own,
});
it("isolates a second installed state and folds only own facts in either installation order", async () => {
  const options = { ...sampleOptions, programas: [sampleProgram, counter] } as const;
  const composed = componer(options);
  const rig = distributionRig(composed.program);
  try {
    rig.attend("notas");
    expect((await settle(rig.act("personal/add", "notas/personal"))).status).toBe("accepted");
    expect(rig.state().tools).toEqual({ notas: { count: 1 }, counter: 20 });
    rig.restart();
    expect(rig.state().tools).toEqual({ notas: { count: 1 }, counter: 20 });
  } finally {
    rig.close();
  }
  const reverse = componer({ ...sampleOptions, programas: [counter, sampleProgram] });
  const event = {
    layer: "program",
    kind: "counter/added",
    data: 3,
    by: "ana",
    cause: [],
    id: "f1",
    seq: 1,
    at: 0,
  } as const;
  type Together = DistributionOf<readonly [typeof sampleProgram, typeof counter]>;
  const folded = toolsStep<Together>(
    startState<Together>(composed.program.slices, "ana"),
    event,
    composed.program.slices,
  );
  const other = toolsStep<Together>(startState<Together>(reverse.program.slices, "ana"), event, reverse.program.slices);
  expect(folded.tools).toEqual({ notas: { count: 0 }, counter: 23 });
  expect(other.tools).toEqual(folded.tools);
});
it("keeps dynamic state readonly even when JavaScript tries to mutate it", () => {
  const hostile = programa(metadata, {
    ...sampleBody,
    herramientas: {},
    summary: (state: import("../tool-contract.ts").State<Counter>) => {
      Reflect.set(state.tools, "foreign", 1);
      return "mutated";
    },
    plegar: (own: number) => own,
  });
  const composed = componer({ ...sampleOptions, programas: [hostile] });
  const state = startState<DistributionOf<readonly [typeof hostile]>>(composed.program.slices, "ana");
  expect(() => composed.program.registry[0]?.summary(state)).toThrow(TypeError);
  expect(state.tools).toEqual({ counter: 20 });
});
it("rejects group reactions as well as program reactions without executing them", () => {
  const program = programa(metadata, {
    ...sampleBody,
    herramientas: {
      hidden: {
        ...sampleBody.herramientas.personal,
        acts: {},
        view: () => "",
        effects: () => {
          throw new Error("A reaction ran");
        },
      },
    },
    plegar: (own: number) => own,
  });
  expect(diagnostico({ ...sampleOptions, programas: [program] })).toEqual([
    { path: "counter/herramientas/hidden/effects", reason: "reacciones-no-soportadas" },
  ]);
});
it("keeps the original body and metadata frozen after declaration", () => {
  expect(Object.isFrozen(sampleProgram)).toBe(true);
  expect(Object.isFrozen(sampleProgram.hechos)).toBe(true);
  expect(Object.isFrozen(sampleProgram.herramientas)).toBe(true);
  expect(() => {
    Reflect.set(sampleProgram, "id", "other");
  }).not.toThrow();
  expect(sampleProgram.id).toBe("notas");
});
