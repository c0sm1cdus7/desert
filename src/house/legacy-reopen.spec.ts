import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Kind, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { object, visibleText } from "../fields/visible-text.ts";
import { text } from "../fields/fields.ts";
import { MemoryHouseKeys } from "../keychain/custody/house-keys.ts";
import { startHouse } from "../runtime/house-runtime.ts";
import { perform } from "../checks/promises/promised-stage.ts";
import { shop, shopCatalog, shopProgram, type Shop } from "../../tests/support/shop.ts";
import { vocabulary } from "../journal/vocabulary.ts";

it("reopens and refolds all three historical names while rejecting new writes", async () => {
  const home = mkdtempSync(join(tmpdir(), "legacy-reopen-"));
  const names = ["⠀", "\u200b", "ㅤ"];
  const old = vocabulary({
    ...shopCatalog,
    "sale-registered": object({
      ...shopCatalog["sale-registered"].properties,
      sale: Type.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
    }),
  });
  const options = {
    ...shopProgram,
    by: "house",
    secretKeys: new MemoryHouseKeys(),
    creation: {
      admin: "ana",
      language: "es" as const,
      assignments: [{ identity: "ana", tools: ["sales", "payments"], language: "es" as const }],
    },
  };
  let house: ReturnType<typeof startHouse<Shop>> | undefined;
  try {
    house = startHouse(home, { ...options, words: old });
    for (const name of names) house.bus.emit(old.fact("sale-registered", { sale: name, total: 1500 }, "ana"));
    const expected = house.tools.state().tools;
    house.close();
    house = undefined;
    house = startHouse(home, { ...options, projectionVersion: "legacy-reopen/2" });
    expect(house.tools.state().tools).toEqual(expected);
    expect(
      house.journal.replay<string[]>([], (read, event) =>
        event.kind === "sale-registered" ? [...read, event.data.sale] : read,
      ),
    ).toEqual(names);
    for (const name of names) {
      const done = await perform({ ...house, pass: () => {}, setTime: () => {} }, "sales", {
        act: "register",
        input: { sale: name, total: 1500 },
      });
      expect(done.status).toBe("rejected");
      expect(Value.Check(shop.emission, shop.fact("sale-registered", { sale: name, total: 1500 }, "ana"))).toBe(false);
    }
    expect(house.tools.state().tools).toEqual(expected);
  } finally {
    house?.close();
    rmSync(home, { recursive: true, force: true });
  }
});
it("relaxes historical text inside arrays and union arms without changing emissions", () => {
  const schema = object({ values: Type.Array(Type.Union([text("Nombre", ""), Type.Null()])) });
  const words = vocabulary({ saved: schema });
  const emission = words.fact("saved", { values: [null, "\u200b"] }, "ana");
  expect(words.read({ ...emission, id: "1", seq: 1, at: 0 }).data).toEqual(emission.data);
  expect(Value.Check(words.emission, emission)).toBe(false);
  expect(schema.properties.values.items.anyOf[0].pattern).toBe(visibleText);
});
it("does not relax a visible pattern that is not a free-text field", () => {
  const words = vocabulary({ saved: object({ code: Type.String({ pattern: visibleText }) }) });
  expect(() => words.read({ ...words.fact("saved", { code: "\u200b" }, "ana"), id: "1", seq: 1, at: 0 })).toThrow();
});
it("rejects malformed historical schema declarations", () => {
  const schema = Type.String();
  Reflect.deleteProperty(schema, Kind);
  expect(() => vocabulary({ saved: schema })).toThrow("Invalid historical schema");
});
it("keeps a different pattern even on a field marked as free text", () => {
  const field = { ...text("Código", "Código"), pattern: "^ok$" };
  const words = vocabulary({ saved: object({ code: field }) });
  expect(() => words.read({ ...words.fact("saved", { code: "bad" }, "ana"), id: "1", seq: 1, at: 0 })).toThrow();
});
