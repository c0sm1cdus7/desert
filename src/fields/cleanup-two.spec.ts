import { shopShown } from "../../tests/support/shop.ts";
import { Type, type TSchema } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { day, quantity } from "./fields.ts";
import { invalidDefaultShop, invalidOpeningShop } from "../../tests/support/broken-shops.ts";
import { defaultsIn } from "../checks/promises/cases/promised-laws.ts";
import { promisedChecks } from "../checks/promises/cases/promised.ts";

async function checkField(field: TSchema) {
  const base = invalidDefaultShop(0);
  const tool = base.registry.find(item => item.id === "sales");
  const act = tool?.acts.register;
  if (!tool || !act) throw new Error("missing register");
  const input = Type.Object({ total: field });
  const registry = base.registry.map(item =>
    item.id === "sales" ? { ...tool, acts: { ...tool.acts, register: { ...act, input } } } : item,
  );
  const check = promisedChecks({ ...base, registry }, shopShown).find(item =>
    item.name.startsWith("sales · register · promises a case"),
  );
  if (!check) throw new Error("missing check");
  return check.run();
}
it.each([{ ...day("Día"), default: "2025-02-30" }, quantity("Cantidad", 1.2345)])(
  "rejects initial values the house rejects",
  async field => {
    await expect(checkField(field)).rejects.toThrow(/total/u);
  },
);
it.each([
  Type.Unsafe({ oneOf: [Type.Integer({ minimum: 0, default: -2 })] }),
  Type.Intersect([
    Type.Object({ nested: Type.Integer({ minimum: 0, default: -2 }) }),
    Type.Object({ other: Type.String() }),
  ]),
  Type.Tuple([Type.Integer({ minimum: 0, default: -2 })]),
  Type.Object({}, { additionalProperties: Type.Integer({ minimum: 0, default: -2 }) }),
])("finds invalid defaults in each schema branch", field => {
  expect(() => defaultsIn(field, "$.total")).toThrow(/total.*-2/u);
});

it("checks computed openings without a from case", async () => {
  const check = promisedChecks(invalidOpeningShop(), shopShown).find(item =>
    item.name.startsWith("payments · charge · promises a case"),
  );
  await expect(check?.run()).rejects.toThrow(/amount.*-5/u);
});
