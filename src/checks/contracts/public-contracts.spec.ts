// A distribution certifies its contracts from public entries; their boundaries are in tests/laws/contract-entries.
import { expect, it } from "vitest";
import { contractPrograms, documentProgram } from "../../../tests/support/contract-programs.ts";
import { presentation } from "../../../tests/support/installable-program.ts";
import { compose } from "../../runtime/distributions/compose.ts";
import type { ProgramBody, ProgramMetadata } from "../../tools/installable/program.ts";
import { certifyContracts } from "./public-contracts.ts";
const options = {
  programs: contractPrograms,
  identities: true,
  minds: { assistants: false, programs: [] },
  shown: presentation,
} as const;
it("declares the contract halves in the body of a program", () => {
  const halves: Pick<ProgramBody<ProgramMetadata>, "artifact" | "offers" | "requests" | "projectors"> = documentProgram;
  expect(Object.keys(halves.offers ?? {})).toEqual(["fiscal-documents"]);
  expect(Object.keys(halves.projectors ?? {})).toEqual(["voucher"]);
});
it("certifies Sales → Documents from public entries alone, and a copied row does not count", async () => {
  const certification = await certifyContracts(options);
  expect(certification.evidence?.map(row => [row.consumer, row.provider, row.case, row.result])).toEqual([
    ["sales", "documents", "issue-and-read", "passed"],
  ]);
  expect(compose({ ...options, contracts: certification }).program.contractSetup).toBeDefined();
  const copied = { ...certification, evidence: (certification.evidence ?? []).map(row => ({ ...row })) };
  expect(() => compose({ ...options, contracts: copied })).toThrow("undeclared-case");
  expect(() => compose(options)).toThrow("undeclared-case");
});
