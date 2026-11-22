// Contract halves compare in the right direction: wider offers, missing members, constraints and unions.
import { Type, type TSchema } from "@sinclair/typebox";
import type { ContractAction } from "../../tools/contracts/contract-types.ts";
import { describe, expect, it } from "vitest";
import { compareContracts } from "./compare-contracts.ts";

const action = (
  entry: TSchema = Type.Object({ sale: Type.String() }, { additionalProperties: false }),
): ContractAction => ({
  input: entry,
  output: Type.Object({ id: Type.String() }),
  rejections: Type.Object({ code: Type.Literal("invalid") }),
});
const iface = () => ({ actions: { issue: action() }, objects: {}, notices: {} });
describe("contract halves", () => {
  it("accepts wider offered input and ignores unrequested output fields during comparison", () => {
    const offer = iface();
    offer.actions.issue = {
      ...action(
        Type.Object({ sale: Type.String(), note: Type.Optional(Type.String()) }, { additionalProperties: false }),
      ),
      output: Type.Object({ id: Type.String(), number: Type.String() }),
    };
    expect(compareContracts(iface(), offer, "sales/documents")).toEqual([]);
  });
  it("lists all missing and incompatible members exactly", () => {
    const request = {
      ...iface(),
      notices: { issued: { data: Type.Object({ sale: Type.String() }), reading: "house" as const } },
    };
    const offer = {
      ...iface(),
      actions: { issue: action(Type.Object({ sale: Type.Number() }, { additionalProperties: false })) },
    };
    expect(compareContracts(request, offer, "sales/documents")).toEqual([
      "sales/documents/actions/issue/input.sale:incompatible-value",
      "sales/documents/notices/issued:missing",
    ]);
  });
  it("rejects unsupported constraints rather than accepting them", () => {
    const offer = {
      ...iface(),
      actions: {
        issue: action(Type.Object({ sale: Type.String({ pattern: "x" }) }, { additionalProperties: false })),
      },
    };
    expect(compareContracts(iface(), offer, "v/d")).toEqual(["v/d/actions/issue/input.sale:unsupported-schema"]);
  });
});

it("checks optional fields, unions and list elements in the correct direction", () => {
  const request = {
    actions: {},
    notices: {},
    objects: {
      voucher: {
        key: Type.String(),
        reading: "house" as const,
        data: Type.Object({
          number: Type.String(),
          state: Type.Union([Type.Literal("issued"), Type.Literal("voided")]),
          lines: Type.Array(Type.String()),
        }),
      },
    },
  };
  const offer = {
    ...request,
    objects: {
      voucher: {
        ...request.objects.voucher,
        data: Type.Object({
          number: Type.Optional(Type.String()),
          state: Type.Union([Type.Literal("issued"), Type.Literal("pending")]),
          lines: Type.Array(Type.Number()),
        }),
      },
    },
  };
  expect(compareContracts(request, offer, "v/d")).toEqual([
    "v/d/objects/voucher/data.number:may-be-missing",
    "v/d/objects/voucher/data.state:incompatible-value",
    "v/d/objects/voucher/data.lines[]:incompatible-value",
  ]);
});
it("does not combine separate union branches into a manufactured match", () => {
  const request = {
    ...iface(),
    actions: {
      issue: {
        ...action(),
        output: Type.Union([
          Type.Object({ a: Type.String(), b: Type.String() }),
          Type.Object({ c: Type.String(), d: Type.String() }),
        ]),
      },
    },
  };
  const offer = {
    ...iface(),
    actions: { issue: { ...action(), output: Type.Object({ a: Type.String(), c: Type.String() }) } },
  };
  expect(compareContracts(request, offer, "v/d")).toEqual(["v/d/actions/issue/output:incompatible-value"]);
});
