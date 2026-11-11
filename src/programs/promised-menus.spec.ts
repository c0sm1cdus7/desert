// Acts under a menu of a thing: reached down the menus a person opens, each opening on what the thing is today.
import { describe, expect, it } from "vitest";
import { walkedChecks } from "./promised-walk.ts";
import { seated, view } from "./promised-keys.ts";
import { cast, given, staged, type Check } from "./promised-stage.ts";
import { promisedChecks } from "./promised.ts";
import {
  correctingShop,
  lostShown,
  paidCorrected,
  partsShown,
  registered,
} from "../../tests/support/correcting-shop.ts";
import { overpaid, staleShown, totalCorrected, twinsShown } from "../../tests/support/correcting-shop.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Screen } from "../surface/contract.ts";

async function failing(checks: readonly Check[]): Promise<string[]> {
  const failed: string[] = [];
  for (const check of checks) await check.run().catch(() => failed.push(check.name));
  return failed;
}
const keys = (...checks: string[]): string[] => checks.map(check => `${check}, by keys`);
/** Every check that has to reach the act under the menu. */
const everyWalk = [
  ...keys(totalCorrected, paidCorrected, overpaid),
  `${overpaid}, hidden for who prefers not to see what cannot be done`,
];
/** What a person reads on a screen: its title, and each line of its body as text. */
const read = ({ title, body }: Screen): string[] => {
  if (body.kind === "list")
    return [
      title,
      ...body.stacks.flatMap(stack => stack.rows.map(row => [row.key, row.title, row.detail].join(" | "))),
    ];
  const said = body.kind === "thread" ? body.events.map(event => event.text.map(span => span.text).join("")) : [];
  return [title, ...said, ...(body.kind === "thread" && body.entry ? [`› ${body.entry.typed}`] : [])];
};
/** A sale registered, and ana in front of it with her keys. */
type Hands = Readonly<{ typed: (keys: string) => string[]; esc: () => string[]; settled: () => Promise<string[]> }>;
const atSale = (shown: Shown<Shop>, use: (hands: Hands) => Promise<void>) =>
  staged(correctingShop, async ({ house }) => {
    await given(house(), "sales", [registered]);
    const { router } = seated(house(), cast.admin, shown);
    const now = (): string[] => read(router.screen(view));
    const typed = (text: string): string[] => {
      for (const char of Array.from(text))
        router.send(char === "\r" ? { kind: "confirm" } : { kind: "type", text: char });
      return now();
    };
    const esc = (): string[] => {
      router.send({ kind: "cancel" });
      return now();
    };
    const settled = (): Promise<string[]> => router.idle().then(now);
    router.send({ kind: "confirm" });
    router.send({ kind: "confirm" });
    await use({ typed, esc, settled }).finally(() => router.stop());
  });

describe("a program with a menu on its things", () => {
  for (const check of promisedChecks(correctingShop)) it(check.name, check.run);
  for (const check of walkedChecks(correctingShop, shopShown)) it(check.name, check.run);
  for (const check of walkedChecks(correctingShop, partsShown)) it(`${check.name}, each part alone`, check.run);

  it("opens the menu from the thing's actions, and each act under it on what the thing is today", async () => {
    await atSale(shopShown, ({ typed, esc }) => {
      expect(typed("")).toContain("e | Editar | Corrige la venta.");
      expect(typed("e")).toEqual(["Editar", "c | Corregir | $ 15,00 · $ 0,00"]);
      expect(typed("c")).toEqual(["Corregir", "Total", "› $ 15,00"]);
      expect(typed("0\r")).toEqual(["Corregir", "Total $ 150,00", "Cobrado", "› $ 0,00"]);
      expect(esc()).toEqual(["Corregir", "Total", "› $ 150,00"]);
      expect(esc()[0]).toBe("Editar");
      return Promise.resolve();
    });
  });

  it("asks one part alone when a row asks only that: the rest shows as it is, and stays as it is", async () => {
    await atSale(partsShown, async ({ typed, esc, settled }) => {
      expect(typed("e")).toEqual(["Editar", "p | Partes | "]);
      expect(typed("p")).toEqual(["Partes", "t | Total | $ 15,00", "b | Cobrado | $ 0,00"]);
      expect(typed("b")).toEqual(["Corregir", "Total $ 15,00", "Cobrado", "› $ 0,00"]);
      expect(esc()[0]).toBe("Partes");
      typed("b500\r");
      expect((await settled()).at(-1)).toContain("Listo Corrected s1");
      expect(esc()).toEqual(["Partes", "t | Total | $ 15,00", "b | Cobrado | $ 5,00"]);
    });
  });

  it("fails the walk of an act that no list a person reaches has", async () => {
    expect(await failing(walkedChecks(correctingShop, lostShown))).toEqual(everyWalk);
  });

  it("fails the walk a row breaks by saying the thing is today what it is not, and no other", async () => {
    expect(await failing(walkedChecks(correctingShop, staleShown))).toEqual(keys(totalCorrected));
  });

  it("fails every walk through a list where two rows take one key", async () => {
    expect(await failing(walkedChecks(correctingShop, twinsShown))).toEqual(everyWalk);
  });
});
