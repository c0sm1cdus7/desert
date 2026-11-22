// Independent consumer and provider declarations for the contractual execution fixtures.
import { Type } from "@sinclair/typebox";
import type { ContractPackage, ContractOffer, ContractCase } from "../../src/tools/contracts/package-contracts.ts";
export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture member");
  return value;
}
export const input = () => Type.Object({ sale: Type.String() }, { additionalProperties: false });
export const rejection = () => Type.Object({ code: Type.Literal("invalid") });
export const receipt = () => Type.Object({ number: Type.String(), state: Type.Literal("issued") });
const documentOffer = (): ContractOffer => ({
  version: "1.3.0",
  actions: {
    issue: {
      route: "fiscal/issue",
      input: input(),
      output: Type.Object({ id: Type.String(), number: Type.String() }),
      rejections: rejection(),
    },
  },
  objects: {
    voucher: {
      key: Type.String(),
      data: receipt(),
      reading: "house",
      projector: "voucher",
    },
  },
  notices: {
    issued: {
      fact: "documents/issued",
      data: Type.Object({ sale: Type.String(), voucher: Type.String() }),
      reading: "house",
    },
  },
});
export const documents = (): ContractPackage => ({
  id: "documents",
  version: "3.0.0",
  artifact: "documents-commit",
  desert: 1,
  tools: { fiscal: ["issue"] },
  facts: ["documents/issued"],
  requests: {},
  projectors: {
    voucher: (own, key) => {
      const state = own.fiscal;
      const value: unknown = state instanceof Map ? state.get(key) : undefined;
      return value;
    },
  },
  offers: {
    "fiscal-documents": documentOffer(),
  },
});
const consumerCases = (): readonly ContractCase[] => [
  {
    id: "issue-and-read",
    actor: "beto",
    prepare: {
      version: 2,
      selections: [
        { kind: "tool", program: "documents", tool: "fiscal" },
        { kind: "tool", program: "sales", tool: "billing" },
      ],
    },
    steps: [
      {
        kind: "action",
        name: "issue",
        input: { sale: "v1" },
        expect: { status: "accepted", value: { id: "v1" } },
      },
      { kind: "notices", name: "issued", expect: [{ sale: "v1", voucher: "v1" }] },
      {
        kind: "read",
        name: "voucher",
        key: "v1",
        at: "notice",
        expect: {
          status: "found",
          value: { number: "1", state: "issued" },
        },
      },
      {
        kind: "action",
        name: "issue",
        input: { sale: "v1" },
        expect: { status: "accepted", value: { id: "v1" } },
      },
      { kind: "notices", name: "issued", expect: [{ sale: "v1", voucher: "v1" }] },
    ],
  },
];
export const sales = (): ContractPackage => ({
  id: "sales",
  version: "2.0.0",
  artifact: "sales-commit",
  desert: 1,
  tools: { billing: ["invoice"] },
  facts: [],
  projectors: {},
  offers: {},
  requests: {
    "fiscal-documents": {
      actions: {
        issue: {
          input: Type.Object({ sale: Type.String() }, { additionalProperties: false }),
          output: Type.Object({ id: Type.String() }),
          rejections: Type.Object({ code: Type.Literal("invalid") }),
        },
      },
      objects: {
        voucher: {
          key: Type.String(),
          data: Type.Object({ number: Type.String(), state: Type.Literal("issued") }),
          reading: "house",
        },
      },
      notices: {
        issued: {
          data: Type.Object({ sale: Type.String(), voucher: Type.String() }),
          reading: "house",
        },
      },
      cases: consumerCases(),
    },
  },
});
