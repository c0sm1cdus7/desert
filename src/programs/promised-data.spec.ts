// A datum that an act changes: its row is where the act is taken from, saying what the datum is today.
import { describe, expect, it } from "vitest";
import { houseTools } from "../surface/bridge/house-tools.ts";
import type { Screen } from "../surface/contract.ts";
import { localPorts } from "./house-runtime.ts";
import { goTo, seated, view } from "./promised-keys.ts";
import { prefer } from "./promised-off.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { programChecks } from "./program-checks.ts";
import { astrayShop, looseShop, paidWhole, pricingShop, registered } from "../../tests/support/pricing-shop.ts";
import { shopShown } from "../../tests/support/shop.ts";

/** What a person reads on a list: each stack by its title, and each row by its key, what it says and its datum. */
const read = ({ body }: Screen): string[] =>
  body.kind === "list"
    ? body.stacks.flatMap(stack => [
        stack.title,
        ...stack.rows.map(row => [row.key, row.title, row.detail, row.off ? "off" : ""].join(" | ")),
      ])
    : [];
type Given = Parameters<typeof given>[2];
/** The sale as ana has it in front, after what was done to it; and as she has it once she hides what cannot be done. */
const atSale = (done: Given, use: (now: () => string[], hide: () => Promise<void>) => Promise<void>) =>
  staged(pricingShop, async ({ house }) => {
    await given(house(), "sales", done);
    const seat = seated(house(), cast.admin, shopShown);
    const hide = async (): Promise<void> => {
      seat.router.send({ kind: "menu" });
      await prefer(seat, "off", true);
      goTo(seat, "sales", "sales/s1");
    };
    goTo(seat, "sales", "sales/s1");
    await use(() => read(seat.router.screen(view)), hide).finally(() => seat.router.stop());
  });

describe("a program whose act changes a datum its tool reads", () => {
  for (const check of programChecks(pricingShop, shopShown)) it(check.name, check.run);

  it("takes the act from the row of that datum, with its key and what it is today: never among the actions", () =>
    atSale([registered], now => {
      expect(now()).toEqual(["Datos", "t | total | $ 1500 | ", " | Cobrado | $ 0 | ", " | Registró | ana | "]);
      return Promise.resolve();
    }));

  it("keeps saying the datum while it cannot be changed, and says why after it", () =>
    atSale([registered, paidWhole], now => {
      expect(now()[1]).toBe("t | total | $ 1500 · paid | off");
      return Promise.resolve();
    }));

  it("keeps the datum read for who prefers not to see what cannot be done: only the way to change it goes", () =>
    atSale([registered, paidWhole], async (now, hide) => {
      await hide();
      expect(now()).toEqual(["Datos", " | total | $ 1500 | ", " | Cobrado | $ 1500 | ", " | Registró | ana | "]);
    }));

  it("refuses an act named as a datum that does not say it changes it, and one that changes what is not read", () => {
    const composed = (program: typeof pricingShop) => () =>
      staged(program, ({ house }) => {
        houseTools(localPorts(house(), cast.admin, { recentLines: 100 }), shopShown);
        return Promise.resolve();
      });
    return Promise.all([
      expect(composed(looseShop)()).rejects.toThrow("price of sales changes a datum its tool reads"),
      expect(composed(astrayShop)()).rejects.toThrow("price of sales changes a datum its tool does not read: price"),
    ]);
  });
});
