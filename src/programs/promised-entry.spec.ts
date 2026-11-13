// A compiling surface that turns a field's live reason into an Error must fail the derived walk.
import { describe, expect, it } from "vitest";
import { checkingShop, wrongName } from "../../tests/support/checking-shop.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { countingShop } from "../../tests/support/counting-shop.ts";
import { programChecks } from "./program-checks.ts";
import { walkedChecks } from "./promised-walk.ts";

const shouting: Shown<Shop> = {
  ...shopShown,
  screens: {
    payments: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        acts: Object.fromEntries(
          Object.entries(plain.acts).map(([name, act]) => [
            name,
            {
              ...act,
              next: answers => {
                const field = act.next(answers);
                if (!field) return null;
                return {
                  ...field,
                  wrong: typed => {
                    const why = field.wrong?.(typed);
                    return why === undefined ? undefined : `Error ${why}`;
                  },
                };
              },
            },
          ]),
        ),
      };
    },
  },
};
describe("a question never marks an input error", () => {
  it("fails only the case whose question shows an Error, with a variant that compiles", async () => {
    const failed: string[] = [];
    for (const check of walkedChecks(checkingShop, shouting)) await check.run().catch(() => failed.push(check.name));
    expect(failed).toEqual([`${wrongName}, by keys`]);
  });
});

/** A plain numeric reason is still forbidden while the amount is only a prefix. */
const impatient: Shown<Shop> = {
  ...shopShown,
  screens: {
    payments: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        acts: Object.fromEntries(
          Object.entries(plain.acts).map(([name, act]) => [
            name,
            {
              ...act,
              next: answers => {
                const field = act.next(answers);
                return field?.kind === "text"
                  ? { ...field, wrong: value => (value === "0" ? "mínimo 0001" : field.wrong?.(value)) }
                  : field;
              },
            },
          ]),
        ),
      };
    },
  },
};
it("fails a compiling surface that adds a reason to an incomplete number", async () => {
  const check = walkedChecks(countingShop, impatient).find(check =>
    check.name.endsWith("numeric prefixes stay quiet until the whole answer is ready, by keys"),
  );
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow("incomplete answer shows a reason");
});

for (const check of programChecks(countingShop, shopShown)) it(check.name, check.run);
