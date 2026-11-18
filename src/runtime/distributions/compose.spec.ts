import { describe, expect, it } from "vitest";
import { componer, diagnostico, CompositionError } from "./compose.ts";
import { sampleProgram, sampleOptions } from "../../../tests/support/installable-program.ts";
import type { CompositionOptions } from "./validation-types.ts";
const issue = (path: string, reason: string) => ({ path, reason });
describe("installable composition", () => {
  it("builds one engine tool for each program, its words, manifest and code version", () => {
    const result = componer(sampleOptions);
    expect(result.program.registry.map(tool => tool.id)).toEqual(["notas"]);
    expect(result.program.slices.initial.notas).toEqual({ count: 0 });
    expect(result.shown.words.notas?.name).toBe("Notas");
    expect(Object.keys(result.program.registry[0]?.acts ?? {})).toEqual([
      "personal/add",
      "personal/edit",
      "shared/add",
      "shared/edit",
    ]);
    expect(result.manifest.programas.map(p => [p.id, p.version])).toEqual([["notas", "1.0.0"]]);
    expect(result.calculation.value).toMatch(/^[a-f0-9]{64}$/);
    expect(result.calculation.trees).toContain(sampleProgram.codigo[0]);
  });
  const empty = { ...sampleProgram, hechos: [] };
  const negatives: readonly [string, CompositionOptions, readonly ReturnType<typeof issue>[]][] = [
    [
      "contract",
      { ...sampleOptions, programas: [{ ...sampleProgram, desert: 2 }] },
      [issue("notas/desert", "contrato-desert")],
    ],
    ["duplicate id alone", { ...sampleOptions, programas: [empty, empty] }, [issue("programas/notas", "id-repetido")]],
    [
      "duplicate fact alone",
      {
        ...sampleOptions,
        programas: [{ ...sampleProgram, hechos: [...sampleProgram.hechos, ...sampleProgram.hechos] }],
      },
      [issue("hechos/notas/anotada", "hecho-repetido")],
    ],
    [
      "foreign fact alone",
      {
        ...sampleOptions,
        programas: [{ ...sampleProgram, hechos: [{ ...sampleProgram.hechos[0], nombre: "ajeno/x" }] }],
      },
      [issue("notas/hechos/ajeno/x", "hecho-ajeno")],
    ],
    [
      "missing mind",
      { ...sampleOptions, mentes: { asistentes: false, programas: ["ausente"] } },
      [issue("mentes/programas/ausente", "mente-ausente")],
    ],
    [
      "assistants without identities",
      { ...sampleOptions, identidades: false, mentes: { asistentes: true, programas: [] } },
      [issue("mentes/asistentes", "asistentes-requiere-identidades")],
    ],
    [
      "reactions",
      { ...sampleOptions, programas: [{ ...sampleProgram, effects: () => [] }] },
      [issue("notas/effects", "reacciones-no-soportadas")],
    ],
  ];
  it.each(negatives)("rejects exactly the isolated reason: %s", (_name, options, expected) => {
    expect(diagnostico(options)).toEqual(expected);
    expect(() => {
      Reflect.apply(componer, undefined, [options]);
    }).toThrow(CompositionError);
    try {
      Reflect.apply(componer, undefined, [options]);
    } catch (error) {
      expect(error).toBeInstanceOf(CompositionError);
      if (error instanceof CompositionError) expect(error.issues).toEqual(expected);
    }
  });
  it("lists every simultaneous reason in deterministic paths", () => {
    expect(
      diagnostico({
        ...sampleOptions,
        programas: [{ ...sampleProgram, desert: 2, effects: () => [] }],
        mentes: { asistentes: false, programas: ["ausente"] },
      }),
    ).toEqual([
      issue("notas/desert", "contrato-desert"),
      issue("notas/effects", "reacciones-no-soportadas"),
      issue("mentes/programas/ausente", "mente-ausente"),
    ]);
  });
});
