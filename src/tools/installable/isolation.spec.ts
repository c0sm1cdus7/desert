import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { defineProgram, type LocalProgram } from "./program.ts";
import { sampleProgram, sampleOptions, sampleBody } from "../../../tests/support/installable-program.ts";
import { compose, diagnose, type DistributionOf } from "../../runtime/distributions/compose.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { startState, toolsStep } from "../../house/state.ts";
const metadata = {
  id: "counter",
  desert: 1,
  version: "1.0.0",
  code: [import.meta.filename],
  facts: [{ kind: "counter/added", schema: Type.Number() }],
  initial: () => 20,
} as const;
type Counter = LocalProgram<typeof metadata>;
const counter = defineProgram(metadata, {
  ...sampleBody,
  tools: {},
  words: { ...sampleBody.words, name: "Contador", key: "c" },
  fold: (own: number, event: import("../../journal/vocabulary.ts").Event<Counter["fact"]>) =>
    event.layer === "program" ? own + event.data : own,
});
it("isolates a second installed state and folds only own facts in either installation order", async () => {
  const options = { ...sampleOptions, programs: [sampleProgram, counter] } as const;
  const composed = compose(options);
  const rig = distributionRig(composed.program);
  try {
    rig.attend("notes");
    expect((await settle(rig.act("personal/add", "notes/personal"))).status).toBe("accepted");
    expect(rig.state().tools).toEqual({ notes: { count: 1 }, counter: 20 });
    rig.restart();
    expect(rig.state().tools).toEqual({ notes: { count: 1 }, counter: 20 });
  } finally {
    rig.close();
  }
  const reverse = compose({ ...sampleOptions, programs: [counter, sampleProgram] });
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
  expect(folded.tools).toEqual({ notes: { count: 0 }, counter: 23 });
  expect(other.tools).toEqual(folded.tools);
});
it("keeps dynamic state readonly even when JavaScript tries to mutate it", () => {
  const hostile = defineProgram(metadata, {
    ...sampleBody,
    tools: {},
    summary: (state: import("../tool-contract.ts").State<Counter>) => {
      Reflect.set(state.tools, "foreign", 1);
      return "mutated";
    },
    fold: (own: number) => own,
  });
  const composed = compose({ ...sampleOptions, programs: [hostile] });
  const state = startState<DistributionOf<readonly [typeof hostile]>>(composed.program.slices, "ana");
  expect(() => composed.program.registry[0]?.summary(state)).toThrow(TypeError);
  expect(state.tools).toEqual({ counter: 20 });
});
it("rejects group reactions as well as program reactions without executing them", () => {
  const program = defineProgram(metadata, {
    ...sampleBody,
    tools: {
      hidden: {
        ...sampleBody.tools.personal,
        acts: {},
        view: () => "",
        effects: () => {
          throw new Error("A reaction ran");
        },
      },
    },
    fold: (own: number) => own,
  });
  expect(diagnose({ ...sampleOptions, programs: [program] })).toEqual([
    { path: "counter/tools/hidden/effects", reason: "unsupported-reactions" },
  ]);
});
it("keeps the original body and metadata frozen after declaration", () => {
  expect(Object.isFrozen(sampleProgram)).toBe(true);
  expect(Object.isFrozen(sampleProgram.facts)).toBe(true);
  expect(Object.isFrozen(sampleProgram.tools)).toBe(true);
  expect(() => {
    Reflect.set(sampleProgram, "id", "other");
  }).not.toThrow();
  expect(sampleProgram.id).toBe("notes");
});
