// Missing references stay in the program's cases: other doors refuse them and keys cannot choose them.
import { describe, expect, it } from "vitest";
import { chargingShop } from "../../tests/support/charging-shop.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { programChecks } from "./program-checks.ts";
import { promisedChecks } from "./promised.ts";
import { walkedChecks } from "./promised-walk.ts";

const missing = "a sale nobody registered";
const invented: Shown<Shop> = {
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
                if (field?.kind !== "pick") return field;
                return { ...field, found: sought => [...field.found(sought), { title: "ghost", value: "sales/zz" }] };
              },
            },
          ]),
        ),
      };
    },
  },
};
describe("a case naming a thing that does not exist", () => {
  for (const check of programChecks(chargingShop, shopShown).filter(check => check.name.includes(missing)))
    it(check.name, check.run);

  it("fails a compiling program that drops the early refusal", async () => {
    const registry = chargingShop.registry.map(tool => ({
      ...tool,
      acts: Object.fromEntries(
        Object.entries(tool.acts).map(([name, act]) => [
          name,
          name === "charge" ? { ...act, stops: () => undefined } : act,
        ]),
      ),
    }));
    const check = promisedChecks({ ...chargingShop, registry }, shopShown).find(check => check.name.endsWith(missing));
    expect(check).toBeDefined();
    await expect(check?.run()).rejects.toMatchObject({
      actual: ["accepted", undefined],
      expected: ["rejected", "unknown"],
    });
  });
  it("fails a compiling surface that invents a row for the missing reference", async () => {
    const check = walkedChecks(chargingShop, invented).find(check => check.name.endsWith(`${missing}, by keys`));
    expect(check).toBeDefined();
    await expect(check?.run()).rejects.toThrow("The refusal is not visible where it is chosen: unknown");
  });
});
