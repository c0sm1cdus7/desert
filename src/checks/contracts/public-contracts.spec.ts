// A distribution certifies its contracts from public entries; their boundaries are in tests/laws/contract-entries.
import { expect, it } from "vitest";
import { contractPrograms, documentProgram } from "../../../tests/support/contract-programs.ts";
import { presentation } from "../../../tests/support/installable-program.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import type { ProgramBody, ProgramMetadata } from "../../tools/installable/program.ts";
import { certifyContracts } from "./public-contracts.ts";
const options = {
  programas: contractPrograms,
  identidades: true,
  mentes: { asistentes: false, programas: [] },
  presentacion: presentation,
} as const;
it("declares the contract halves in the body of a program", () => {
  const halves: Pick<ProgramBody<ProgramMetadata>, "artifact" | "ofrece" | "pide" | "proyectores"> = documentProgram;
  expect(Object.keys(halves.ofrece ?? {})).toEqual(["documentos-fiscales"]);
  expect(Object.keys(halves.proyectores ?? {})).toEqual(["comprobante"]);
});
it("certifies Sales → Documents from public entries alone, and a copied row does not count", async () => {
  const certification = await certifyContracts(options);
  expect(certification.evidence?.map(row => [row.consumer, row.provider, row.case, row.result])).toEqual([
    ["ventas", "documentos", "emitir-y-leer", "passed"],
  ]);
  expect(componer({ ...options, contratos: certification }).program.contractSetup).toBeDefined();
  const copied = { ...certification, evidence: (certification.evidence ?? []).map(row => ({ ...row })) };
  expect(() => componer({ ...options, contratos: copied })).toThrow("caso-no-declarado");
  expect(() => componer(options)).toThrow("caso-no-declarado");
});
