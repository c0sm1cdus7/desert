// The contract entries keep their boundaries: a program never imports desert/contracts, a distribution certifies.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { installablePackage } from "../support/installable-package.ts";
import { lawPackage, lawRepository } from "../support/law-repository.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import { programImports } from "../../src/checks/laws/program-imports.ts";
import { field, isRecord } from "../../src/fields/json-values.ts";
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
