// A program repository certifies its contracts through public entries; a program never imports that entry.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { contractPrograms, documentProgram } from "../../../tests/support/contract-programs.ts";
import { presentation } from "../../../tests/support/installable-program.ts";
import { installablePackage } from "../../../tests/support/installable-package.ts";
import { lawPackage, lawRepository } from "../../../tests/support/law-repository.ts";
import { programSecretBoundaries } from "../../../tests/laws/program-secret-boundaries.ts";
import { field, isRecord } from "../../fields/json-values.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import type { ProgramBody, ProgramMetadata } from "../../tools/installable/program.ts";
import { programImports } from "../laws/program-imports.ts";
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
it("keeps desert/contracts out of a program, which still imports the contract types from desert/programa", () => {
  const manifest = JSON.stringify({
    ...lawPackage,
    desert: { ...lawPackage.desert, testDistribution: "tests/distribution.ts", dependencies: [] },
  });
  const certifying = lawRepository({ "package.json": manifest, "src/a.ts": 'import "desert/contracts";' });
  expect(programImports(certifying)).toEqual(["src/a.ts → desert/contracts"]);
  const typed = installablePackage();
  const path = join(typed.root, "src/notes.ts");
  const types = 'import type { ContractPackage, ContractOffer, ContractCase } from "desert/programa";';
  writeFileSync(
    path,
    `${readFileSync(path, "utf8")}${types}\nexport type Halves = [ContractPackage, ContractOffer, ContractCase];\n`,
  );
  expect(programSecretBoundaries(typed.root)).toEqual([]);
});
it("lets a declared distribution certify through desert/contracts", () => {
  const repo = installablePackage();
  const path = join(repo.root, "package.json");
  const pkg: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(pkg)) throw new Error("missing package");
  const laws = field(field(pkg, "desert"), "laws");
  writeFileSync(path, JSON.stringify({ ...pkg, desert: { kind: "distribution", program: "src/host.ts", laws } }));
  writeFileSync(
    join(repo.root, "src/host.ts"),
    `import { certifyContracts, type ContractCertification } from "desert/contracts";
export const certify: typeof certifyContracts = certifyContracts;
export type Certified = ContractCertification;
export const program = { registry: [], slices: {}, words: {} };
export const shown = { words: {}, locale: {} };
`,
  );
  expect(programSecretBoundaries(repo.root)).toEqual([]);
});
