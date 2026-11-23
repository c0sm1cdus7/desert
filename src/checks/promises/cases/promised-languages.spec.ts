// A program that says a word in one language fails its gate; one that says every word in every language passes.
import { expect, it } from "vitest";
import { shopProgram, shopShown, salesTool } from "../../../../tests/support/shop.ts";
import { languageChecks } from "./promised-languages.ts";
it("passes a program that says every word it declares in English and in Spanish", async () => {
  const checks = languageChecks(shopProgram, shopShown);
  expect(checks.map(check => check.name)).toEqual([
    "sales · says every word it declares in every language",
    "payments · says every word it declares in every language",
  ]);
  for (const check of checks) await expect(check.run()).resolves.toBeUndefined();
});
it("fails a program that declares a word in Spanish only, and names where", async () => {
  const register = salesTool.acts.register;
  const told = register?.cases[0];
  if (!register || !told) throw new Error("register");
  const cases = [{ ...told, then: { says: "Registrada · s1", facts: [] } }] as const;
  const sales = { ...salesTool, acts: { register: { ...register, name: "registrar", cases } } };
  const shown = shopShown.words.sales;
  if (!shown) throw new Error("sales");
  const words = { ...shopShown.words, sales: { ...shown, name: "Ventas" } };
  const [check] = languageChecks({ ...shopProgram, registry: [sales] }, { ...shopShown, words });
  const failure: unknown = await check?.run().catch((error: unknown) => error);
  expect(failure).toHaveProperty(
    "message",
    expect.stringContaining("sales declares words in one language only: each says itself in every one"),
  );
  expect(failure).toHaveProperty("actual", ["sales.words.name", "sales.register.name", "sales.register.case0.says"]);
});
