import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { compose, diagnose, CompositionError } from "./compose.ts";
import { contractOptions, contractCertification, required } from "../../../tests/support/distribution-contracts.ts";
import { contractPrograms, documentProgram, salesProgram } from "../../../tests/support/contract-programs.ts";
const missing = { path: "sales/fiscal-documents/cases/issue-and-read", reason: "undeclared-case" };
it("composes the installed halves only after their consumer cases passed", () => {
  expect(contractCertification.evidence.map(row => row.result)).toEqual(["passed"]);
  expect(diagnose(contractOptions)).toEqual([]);
  expect(compose(contractOptions).program.registry.map(program => program.id)).toEqual(["sales", "documents"]);
  const { contracts: _certification, ...unverified } = contractOptions;
  expect(diagnose(unverified)).toEqual([missing]);
  expect(() => compose(unverified)).toThrow(CompositionError);
});
it("preserves all contract paths alongside the core composition diagnostics", () => {
  const offer = required(documentProgram.offers["fiscal-documents"]);
  const action = required(offer.actions.issue);
  const options = {
    ...contractOptions,
    programs: [
      salesProgram,
      {
        ...documentProgram,
        offers: {
          "fiscal-documents": {
            ...offer,
            actions: {
              issue: { ...action, input: Type.Object({ sale: Type.Number() }, { additionalProperties: false }) },
            },
          },
        },
      },
    ],
    minds: { assistants: false, programs: ["missing"] },
  };
  const issues = diagnose(options);
  expect(issues).toEqual([
    { path: "minds/programs/missing", reason: "missing-mind" },
    { path: "sales/fiscal-documents/actions/issue/input.sale", reason: "incompatible-value" },
    missing,
  ]);
  try {
    Reflect.apply(compose, undefined, [options]);
    throw new Error("Expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(CompositionError);
    if (error instanceof CompositionError) expect(error.issues).toEqual(issues);
  }
});
it("does not accept evidence from another executor or copied rows", () => {
  expect(
    diagnose({
      ...contractOptions,
      contracts: { ...contractOptions.contracts, build: { core: "fixture-core", executor: "other" } },
    }),
  ).toEqual([missing]);
  expect(
    diagnose({
      ...contractOptions,
      contracts: { ...contractOptions.contracts, evidence: contractCertification.evidence.map(row => ({ ...row })) },
    }),
  ).toEqual([missing]);
});
it("reports missing providers and invalid offered routes through composition", () => {
  expect(diagnose({ ...contractOptions, programs: [salesProgram] })).toEqual([
    { path: "sales/fiscal-documents", reason: "no-provider" },
  ]);
  const offer = required(documentProgram.offers["fiscal-documents"]);
  const changed = {
    ...documentProgram,
    offers: {
      "fiscal-documents": {
        ...offer,
        actions: { issue: { ...required(offer.actions.issue), route: "fiscal/borrar" } },
      },
    },
  };
  expect(diagnose({ ...contractOptions, programs: [contractPrograms[0], changed] })).toEqual([
    { path: "documents/fiscal-documents/actions/issue", reason: "foreign-route:fiscal/borrar" },
    missing,
  ]);
});
it("rejects both routes of a cycle when composing independently valid halves", () => {
  const empty = { actions: {}, objects: {}, notices: {} };
  const options = {
    ...contractOptions,
    programs: [
      { ...salesProgram, offers: { "public-sales": { ...empty, version: "1.0.0" } } },
      { ...documentProgram, requests: { "public-sales": { ...empty, cases: [] } } },
    ],
  } as const;
  expect(diagnose(options).filter(issue => issue.reason === "cycle")).toEqual([
    { path: "sales-[fiscal-documents]->documents-[public-sales]->sales", reason: "cycle" },
    { path: "documents-[public-sales]->sales-[fiscal-documents]->documents", reason: "cycle" },
  ]);
  expect(() => compose(options)).toThrow(CompositionError);
});
