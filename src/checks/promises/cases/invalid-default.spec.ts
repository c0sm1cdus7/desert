import { shopShown } from "../../../../tests/support/shop.ts";
import { expect, it } from "vitest";
import { invalidDefaultShop } from "../../../../tests/support/broken-shops.ts";
import { promisedChecks } from "./promised.ts";
it.each([-5, 1.5, 10000000000000])("rejects invalid initial amount %s during derived checks", async value => {
  const checks = promisedChecks(invalidDefaultShop(value), shopShown);
  const check = checks.find(item => item.name.startsWith("sales · register · promises a case"));
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow(new RegExp(`total.*${value}`));
});
it("accepts valid boundary defaults", async () => {
  for (const value of [0, 9999999999999]) {
    const check = promisedChecks(invalidDefaultShop(value), shopShown).find(item =>
      item.name.startsWith("sales · register · promises a case"),
    );
    await expect(check?.run()).resolves.toBeUndefined();
  }
});

it("finds defaults inside nested objects, variants and arrays", async () => {
  const { Type } = await import("@sinclair/typebox");
  const broken = invalidDefaultShop(0);
  const tool = broken.registry.find(item => item.id === "sales");
  const act = tool?.acts.register;
  if (!tool || !act) throw new Error("missing sales register");
  const fields = [
    Type.Object({ nested: Type.Integer({ minimum: 0, default: -2 }) }),
    Type.Union([Type.String(), Type.Integer({ minimum: 0, default: -2 })]),
    Type.Array(Type.Integer({ minimum: 0, default: -2 })),
    Type.Record(Type.String(), Type.Integer({ minimum: 0, default: -2 })),
  ];
  for (const field of fields) {
    const input = Type.Object({ total: field });
    const registry = broken.registry.map(item =>
      item.id === "sales" ? { ...tool, acts: { ...tool.acts, register: { ...act, input } } } : item,
    );
    const check = promisedChecks({ ...broken, registry }, shopShown).find(item =>
      item.name.startsWith("sales · register · promises a case"),
    );
    await expect(check?.run()).rejects.toThrow(/total.*-2/u);
  }
});
