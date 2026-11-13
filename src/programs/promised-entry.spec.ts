// A compiling surface that turns a field's live reason into an Error must fail the derived walk.
import { describe, expect, it } from "vitest";
import { checkingShop, wrongName } from "../../tests/support/checking-shop.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
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
