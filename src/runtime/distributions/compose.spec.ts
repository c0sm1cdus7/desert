import { describe, expect, it } from "vitest";
import { compose, diagnose, CompositionError } from "./compose.ts";
import { sampleProgram, sampleOptions } from "../../../tests/support/installable-program.ts";
import type { CompositionOptions } from "./validation-types.ts";
const issue = (path: string, reason: string) => ({ path, reason });
describe("installable composition", () => {
  it("builds one engine tool for each program, its words, manifest and code version", () => {
    const result = compose(sampleOptions);
    expect(result.program.registry.map(tool => tool.id)).toEqual(["notes"]);
    expect(result.program.slices.initial.notes).toEqual({ count: 0 });
    expect(result.shown.words.notes?.name).toBe("Notas");
    expect(Object.keys(result.program.registry[0]?.acts ?? {})).toEqual([
      "personal/add",
      "personal/edit",
      "shared/add",
      "shared/edit",
    ]);
    expect(result.manifest.programs.map(p => [p.id, p.version])).toEqual([["notes", "1.0.0"]]);
    expect(result.calculation.value).toMatch(/^[a-f0-9]{64}$/);
    expect(result.calculation.trees).toContain(sampleProgram.code[0]);
  });
  const empty = { ...sampleProgram, facts: [] };
  const negatives: readonly [string, CompositionOptions, readonly ReturnType<typeof issue>[]][] = [
    [
      "distribution dependency",
      { ...sampleOptions, programs: [{ ...sampleProgram, dependencies: [{ kind: "distribution", name: "void" }] }] },
      [issue("notes/dependencies/void", "distribution-dependency")],
    ],
    [
      "contract",
      { ...sampleOptions, programs: [{ ...sampleProgram, desert: 2 }] },
      [issue("notes/desert", "desert-contract")],
    ],
    ["duplicate id alone", { ...sampleOptions, programs: [empty, empty] }, [issue("programs/notes", "duplicate-id")]],
    [
      "duplicate fact alone",
      {
        ...sampleOptions,
        programs: [{ ...sampleProgram, facts: [...sampleProgram.facts, ...sampleProgram.facts] }],
      },
      [issue("facts/notes/added", "duplicate-fact")],
    ],
    [
      "foreign fact alone",
      {
        ...sampleOptions,
        programs: [{ ...sampleProgram, facts: [{ ...sampleProgram.facts[0], kind: "ajeno/x" }] }],
      },
      [issue("notes/facts/ajeno/x", "foreign-fact")],
    ],
    [
      "missing mind",
      { ...sampleOptions, minds: { assistants: false, programs: ["missing"] } },
      [issue("minds/programs/missing", "missing-mind")],
    ],
    [
      "assistants without identities",
      { ...sampleOptions, identities: false, minds: { assistants: true, programs: [] } },
      [issue("minds/assistants", "assistants-require-identities")],
    ],
    [
      "reactions",
      { ...sampleOptions, programs: [{ ...sampleProgram, effects: () => [] }] },
      [issue("notes/effects", "unsupported-reactions")],
    ],
  ];
  it.each(negatives)("rejects exactly the isolated reason: %s", (_name, options, expected) => {
    expect(diagnose(options)).toEqual(expected);
    expect(() => {
      Reflect.apply(compose, undefined, [options]);
    }).toThrow(CompositionError);
    try {
      Reflect.apply(compose, undefined, [options]);
    } catch (error) {
      expect(error).toBeInstanceOf(CompositionError);
      if (error instanceof CompositionError) expect(error.issues).toEqual(expected);
    }
  });
  it("lists every simultaneous reason in deterministic paths", () => {
    expect(
      diagnose({
        ...sampleOptions,
        programs: [{ ...sampleProgram, desert: 2, effects: () => [] }],
        minds: { assistants: false, programs: ["missing"] },
      }),
    ).toEqual([
      issue("notes/desert", "desert-contract"),
      issue("notes/effects", "unsupported-reactions"),
      issue("minds/programs/missing", "missing-mind"),
    ]);
  });
});
