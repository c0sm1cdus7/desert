import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { componer, diagnostico, CompositionError } from "./compose.ts";
import { contractOptions, contractCertification, required } from "../../../tests/support/distribution-contracts.ts";
import { contractPrograms, documentProgram, salesProgram } from "../../../tests/support/contract-programs.ts";
const missing = { path: "ventas/documentos-fiscales/casos/emitir-y-leer", reason: "caso-no-declarado" };
it("composes the installed halves only after their consumer cases passed", () => {
  expect(contractCertification.evidence.map(row => row.result)).toEqual(["passed"]);
  expect(diagnostico(contractOptions)).toEqual([]);
  expect(componer(contractOptions).program.registry.map(program => program.id)).toEqual(["ventas", "documentos"]);
  const { contratos: _certification, ...unverified } = contractOptions;
  expect(diagnostico(unverified)).toEqual([missing]);
  expect(() => componer(unverified)).toThrow(CompositionError);
});
it("preserves all contract paths alongside the core composition diagnostics", () => {
  const offer = required(documentProgram.ofrece["documentos-fiscales"]);
  const action = required(offer.acciones.emitir);
  const options = {
    ...contractOptions,
    programas: [
      salesProgram,
      {
        ...documentProgram,
        ofrece: {
          "documentos-fiscales": {
            ...offer,
            acciones: {
              emitir: { ...action, entrada: Type.Object({ venta: Type.Number() }, { additionalProperties: false }) },
            },
          },
        },
      },
    ],
    mentes: { asistentes: false, programas: ["ausente"] },
  };
  const issues = diagnostico(options);
  expect(issues).toEqual([
    { path: "mentes/programas/ausente", reason: "mente-ausente" },
    { path: "ventas/documentos-fiscales/acciones/emitir/entrada.venta", reason: "valor-incompatible" },
    missing,
  ]);
  try {
    Reflect.apply(componer, undefined, [options]);
    throw new Error("Expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(CompositionError);
    if (error instanceof CompositionError) expect(error.issues).toEqual(issues);
  }
});
it("does not accept evidence from another executor or copied rows", () => {
  expect(
    diagnostico({
      ...contractOptions,
      contratos: { ...contractOptions.contratos, build: { core: "fixture-core", executor: "otro" } },
    }),
  ).toEqual([missing]);
  expect(
    diagnostico({
      ...contractOptions,
      contratos: { ...contractOptions.contratos, evidence: contractCertification.evidence.map(row => ({ ...row })) },
    }),
  ).toEqual([missing]);
});
it("reports missing providers and invalid offered routes through composition", () => {
  expect(diagnostico({ ...contractOptions, programas: [salesProgram] })).toEqual([
    { path: "ventas/documentos-fiscales", reason: "sin-proveedor" },
  ]);
  const offer = required(documentProgram.ofrece["documentos-fiscales"]);
  const changed = {
    ...documentProgram,
    ofrece: {
      "documentos-fiscales": {
        ...offer,
        acciones: { emitir: { ...required(offer.acciones.emitir), ruta: "fiscal/borrar" } },
      },
    },
  };
  expect(diagnostico({ ...contractOptions, programas: [contractPrograms[0], changed] })).toEqual([
    { path: "documentos/documentos-fiscales/acciones/emitir", reason: "ruta-ajena:fiscal/borrar" },
    missing,
  ]);
});
it("rejects both routes of a cycle when composing independently valid halves", () => {
  const empty = { acciones: {}, objetos: {}, avisos: {} };
  const options = {
    ...contractOptions,
    programas: [
      { ...salesProgram, ofrece: { "ventas-publicas": { ...empty, version: "1.0.0" } } },
      { ...documentProgram, pide: { "ventas-publicas": { ...empty, casos: [] } } },
    ],
  } as const;
  expect(diagnostico(options).filter(issue => issue.reason === "ciclo")).toEqual([
    { path: "ventas-[documentos-fiscales]->documentos-[ventas-publicas]->ventas", reason: "ciclo" },
    { path: "documentos-[ventas-publicas]->ventas-[documentos-fiscales]->documentos", reason: "ciclo" },
  ]);
  expect(() => componer(options)).toThrow(CompositionError);
});
