// Isolated runtime negatives: cycles, missing cases and evidence, incompatible and unsupported schemas.
import { required } from "../../../tests/support/distribution-contracts.ts";
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { documents, sales, input, rejection, receipt } from "../../../tests/support/distribution-contracts.ts";
import { structuralContractErrors } from "./package-checks.ts";
import { validateContractPrograms } from "./validate-contracts.ts";
import { runContractCases } from "./contract-gate.ts";
import { contractSelections, contractHouse } from "../../../tests/support/distribution-contracts.ts";
import type { ContractOffer, ContractPackage } from "../../tools/contracts/package-contracts.ts";
const path = "sales/fiscal-documents";
const offered = (): ContractOffer => required(documents().offers["fiscal-documents"]);
const withOffer = (offer: ContractOffer): ContractPackage => ({
  ...documents(),
  offers: { "fiscal-documents": offer },
});
const action = () => required(offered().actions.issue);
const object = () => required(offered().objects.voucher);
const notice = () => required(offered().notices.issued);
const programs = (offer: ContractOffer) => [sales(), withOffer(offer)];
const exact = (actual: readonly string[], expected: readonly string[]) =>
  expect([...new Set(actual)].sort()).toEqual([...expected].sort());
const isolated = [
  [
    "01 input",
    () =>
      programs({
        ...offered(),
        actions: {
          issue: { ...action(), input: Type.Object({ sale: Type.Number() }, { additionalProperties: false }) },
        },
      }),
    [`${path}/actions/issue/input.sale:incompatible-value`],
  ],
  ["02 action missing", () => programs({ ...offered(), actions: {} }), [`${path}/actions/issue:missing`]],
  [
    "03 object field",
    () =>
      programs({
        ...offered(),
        objects: {
          voucher: {
            ...object(),
            data: Type.Object({ number: Type.Number(), state: Type.Literal("issued") }),
          },
        },
      }),
    [`${path}/objects/voucher/data.number:incompatible-value`],
  ],
  [
    "04 notice field",
    () =>
      programs({
        ...offered(),
        notices: {
          issued: { ...notice(), data: Type.Object({ sale: Type.Number(), voucher: Type.String() }) },
        },
      }),
    [`${path}/notices/issued/data.sale:incompatible-value`],
  ],
  ["05 notice missing", () => programs({ ...offered(), notices: {} }), [`${path}/notices/issued:missing`]],
  [
    "06 optional field",
    () =>
      programs({
        ...offered(),
        objects: {
          voucher: {
            ...object(),
            data: Type.Object({ number: Type.Optional(Type.String()), state: Type.Literal("issued") }),
          },
        },
      }),
    [`${path}/objects/voucher/data.number:may-be-missing`],
  ],
  [
    "07 union variant",
    () =>
      programs({
        ...offered(),
        objects: {
          voucher: {
            ...object(),
            data: Type.Object({
              number: Type.String(),
              state: Type.Union([Type.Literal("issued"), Type.Literal("pendiente")]),
            }),
          },
        },
      }),
    [`${path}/objects/voucher/data.state:incompatible-value`],
  ],
  [
    "08 new rejection",
    () =>
      programs({
        ...offered(),
        actions: {
          issue: {
            ...action(),
            rejections: Type.Object({ code: Type.Union([Type.Literal("invalida"), Type.Literal("duplicada")]) }),
          },
        },
      }),
    [`${path}/actions/issue/rejections.code:incompatible-value`],
  ],
  ["09 no provider", () => [sales()], [`no-provider:${path}`]],
  [
    "10 two providers",
    () => [
      sales(),
      documents(),
      {
        ...documents(),
        id: "other",
        facts: ["other/issued"],
        offers: {
          "fiscal-documents": {
            ...offered(),
            notices: { issued: { ...notice(), fact: "other/issued" } },
          },
        },
      },
    ],
    [`multiple-providers:${path}`],
  ],
  ["13 DESERT version", () => [sales(), { ...documents(), desert: 2 }], ["desert-contract:documents"]],
  [
    "14 repeated program",
    () => [
      { ...sales(), id: "x", requests: {} },
      { ...sales(), id: "x", requests: {} },
    ],
    ["duplicate-id:x"],
  ],
  [
    "15 repeated fact",
    () => [sales(), { ...documents(), facts: ["documents/issued", "documents/issued"] }],
    ["duplicate-fact:documents/issued"],
  ],
  [
    "16 foreign fact",
    () => [sales(), { ...documents(), facts: ["documents/issued", "ajeno/x"] }],
    ["foreign-fact:ajeno/x"],
  ],
  [
    "17 foreign action",
    () => programs({ ...offered(), actions: { issue: { ...action(), route: "fiscal/borrar" } } }),
    ["documents/fiscal-documents/actions/issue:foreign-route:fiscal/borrar"],
  ],
  [
    "18 missing projector",
    () => programs({ ...offered(), objects: { voucher: { ...object(), projector: "other" } } }),
    ["documents/fiscal-documents/objects/voucher:missing-projector:other"],
  ],
] satisfies readonly [string, () => readonly ContractPackage[], readonly string[]][];
describe("isolated runtime negatives from dist-2", () => {
  it.each(isolated)("%s", (_name, setup, expected) => {
    exact(structuralContractErrors(setup()), expected);
  });
  it("24 cycle reports exactly both traversals", () => {
    const empty = { actions: {}, objects: {}, notices: {} };
    exact(
      structuralContractErrors([
        { ...sales(), offers: { "public-sales": { ...empty, version: "1.0.0" } } },
        { ...documents(), requests: { "public-sales": { ...empty, cases: [] } } },
      ]),
      [
        "cycle:sales-[fiscal-documents]->documents-[public-sales]->sales",
        "cycle:documents-[public-sales]->sales-[fiscal-documents]->documents",
      ],
    );
  });
  it("11 new case and 12 evidence for another offer each report only their own missing case", async () => {
    const original = [sales(), documents()],
      build = { core: "C", executor: "E" };
    const gate = await runContractCases({
      programs: original,
      provider: "documents",
      consumer: "sales",
      contract: "fiscal-documents",
      build,
      prepare: preparation => contractHouse(undefined, ":memory:", contractSelections(preparation)),
    });
    const consumer = sales(),
      request = required(consumer.requests["fiscal-documents"]);
    const more = {
      ...consumer,
      requests: {
        "fiscal-documents": { ...request, cases: [...request.cases, { ...required(request.cases[0]), id: "other" }] },
      },
    };
    exact(validateContractPrograms([more, documents()], build, gate.evidence, gate.verify).errors, [
      `${path}/cases/other:undeclared-case`,
    ]);
    exact(
      validateContractPrograms(programs({ ...offered(), version: "1.2.0" }), build, gate.evidence, gate.verify).errors,
      [`${path}/cases/issue-and-read:undeclared-case`],
    );
  });
  it("lists three independent incompatible fields without losing a reason", () => {
    exact(
      structuralContractErrors(
        programs({
          ...offered(),
          actions: {
            issue: { ...action(), input: Type.Object({ sale: Type.Number() }, { additionalProperties: false }) },
          },
          objects: {
            voucher: {
              ...object(),
              data: Type.Object({ number: Type.Number(), state: Type.Literal("issued") }),
            },
          },
          notices: {
            issued: { ...notice(), data: Type.Object({ sale: Type.Number(), voucher: Type.String() }) },
          },
        }),
      ),
      [
        `${path}/actions/issue/input.sale:incompatible-value`,
        `${path}/objects/voucher/data.number:incompatible-value`,
        `${path}/notices/issued/data.sale:incompatible-value`,
      ],
    );
  });
  it("does not mistake unsupported unused schemas for an optional extension", () => {
    exact(
      structuralContractErrors(
        programs({
          ...offered(),
          actions: {
            issue: action(),
            extra: {
              route: "fiscal/issue",
              input: input(),
              output: Type.String({ pattern: "x" }),
              rejections: rejection(),
            },
          },
          objects: { voucher: { ...object(), data: receipt() } },
        }),
      ),
      ["documents/fiscal-documents/actions/extra/output:unsupported-schema"],
    );
  });
});
