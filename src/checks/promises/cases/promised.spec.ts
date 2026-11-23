import { failing } from "../../../../tests/support/failed-checks.ts";
// Shops that break a promise, which the derived checks catch; the shop itself is checked as this repository's program.
import { afterAll, describe, expect, it } from "vitest";
import { caseInstant } from "../../../journal/clock.ts";
import { walkedChecks } from "../walk/promised-walk.ts";
import { houseTools } from "../../../surface/bridge/assembly/house-tools.ts";
import { localPorts } from "../../../runtime/house-runtime.ts";
import { cast, given, staged, type Check } from "../promised-stage.ts";
import { promisedChecks } from "./promised.ts";
import { brokenShops } from "../../../../tests/support/broken-shops.ts";
import {
  apartShown,
  every,
  hidingShown,
  nestedShown,
  registered,
  leavingShop,
  mutedShown,
  settledTwice,
  settlingShop,
  carelessShop,
  deafShown,
  stillOwing,
  stubbornShown,
} from "../../../../tests/support/settling-shop.ts";

import { shopShown } from "../../../../tests/support/shop.ts";

const partialKit = "sales · settle · shows an action outside a partial kit";
/** Each check opens and rebuilds its own house; give every check its own timeout and diagnostic. */
function failsExactly(checks: readonly Check[], because: readonly string[], expected: readonly string[]): void {
  const failed: string[] = [];
  // Different checks can share a label; preserve the original exact sequence, including its multiplicity.
  afterAll(() => expect(failed).toEqual(expected));
  for (const check of checks)
    it(check.name, async () => {
      failed.push(...(await failing([check], because)));
      expect(failed).toEqual(expected.slice(0, failed.length));
    });
}
/** The names of the checks that fail, in the order they ran. */
describe("a program that breaks a promise", () => {
  for (const { name, program, fails, because } of brokenShops)
    describe(name, () => {
      const checks = [...promisedChecks(program, shopShown), ...walkedChecks(program, shopShown)];
      failsExactly(checks, because, fails);
    });
});

describe("a program with acts on its things", () => {
  for (const check of promisedChecks(settlingShop, shopShown)) it(check.name, check.run);
  for (const check of walkedChecks(settlingShop, shopShown)) it(check.name, check.run);
  for (const check of walkedChecks(settlingShop, nestedShown)) it(`${check.name}, two views deep`, check.run);
  const hidden = `${settledTwice}, hidden for who prefers not to see what cannot be done`;
  const unavailable = `${settledTwice}, no empty first choice`;
  describe("a screen that lists none of its things fails what has to reach one that nothing else leads to", () => {
    /** A sale that still owes is reached from Attention; a settled one, from nowhere. */
    failsExactly(
      walkedChecks(settlingShop, hidingShown),
      ["no view of the tool leads to sales/s1", "An unavailable action is missing"],
      [`${settledTwice}, by keys`, unavailable, hidden],
    );
  });

  for (const check of walkedChecks(leavingShop, apartShown)) it(`${check.name}, leaving its list`, check.run);

  describe("a screen that takes what cannot be done off its list fails what that refusal promises to show", () => {
    failsExactly(
      walkedChecks(settlingShop, mutedShown),
      ["the act settle is not on the list", "An unavailable action is missing"],
      [`${settledTwice}, by keys`, unavailable, partialKit, hidden],
    );
  });

  describe("a screen that shows what cannot be done to who prefers not to see it fails that, and nothing else", () => {
    failsExactly(
      walkedChecks(settlingShop, stubbornShown),
      ["An unavailable action is shown", "the act settle is not hidden exactly"],
      [unavailable, hidden],
    );
  });

  it("offers an act on a thing where that thing is read, and never on a view that only groups them", async () => {
    await staged(settlingShop, async ({ house }) => {
      await given(house(), "sales", [registered]);
      const tools = houseTools(localPorts(house(), cast.admin, { recentLines: 100 }), nestedShown, "es");
      const settle = tools.find(tool => tool.id === "sales")?.actsOn?.settle;
      expect([settle?.listed?.("sales/s1"), settle?.listed?.(every)]).toEqual([true, false]);
    });
  });

  it("a case that says days passed finds its house that many days later, before and after it is reopened", async () => {
    await staged(settlingShop, async ({ house, reopen }) => {
      await given(house(), "sales", [{ days: 2 }, registered]);
      reopen();
      await given(house(), "sales", [{ days: 1 }]);
      reopen();
      /** A house says when it starts each time it is opened, and a sale when it was registered. */
      const days = house().journal.replay<number[]>([], (at, event) =>
        event.kind === "boot" || event.layer === "program" ? [...at, (event.at - caseInstant) / 86_400_000] : at,
      );
      expect(days).toEqual([0, 2, 2, 3]);
    });
  });

  it("what needs someone may depend on the day: a tool is asked with the time of its own house", async () => {
    const late = (_state: unknown, now: number) => (now > caseInstant ? [{ target: "sales", why: "late" }] : []);
    const registry = settlingShop.registry.map(tool => (tool.id === "sales" ? { ...tool, needs: late } : tool));
    await staged({ ...settlingShop, registry }, async ({ house }) => {
      const ports = localPorts(house(), cast.admin, { recentLines: 100 }, house().now);
      const needs = () =>
        houseTools(ports, shopShown, "es")
          .find(tool => tool.id === "sales")
          ?.notices?.().needs;
      expect(needs()).toEqual([]);
      await given(house(), "sales", [{ days: 1 }]);
      expect(needs()?.map(need => need.detail)).toEqual(["late"]);
    });
  });

  it("a program that needs someone from its first day keeps that list for who prefers no empty ones", async () => {
    const always = () => [{ target: "sales", why: "from the start" }];
    const registry = settlingShop.registry.map(tool => (tool.id === "sales" ? { ...tool, needs: always } : tool));
    const checks = walkedChecks({ ...settlingShop, registry }, shopShown);
    const lists = checks.filter(check => check.name.includes("nothing in them"));
    expect(lists).toHaveLength(1);
    expect(await failing(lists, [])).toEqual([]);
  });

  it("an act on the tool itself that is not for someone is off for them, and hidden if they prefer", async () => {
    const cause = "not for beto";
    const registry = settlingShop.registry.map(tool => {
      const register = tool.acts.register;
      if (tool.id !== "sales" || !register) return tool;
      const closed = { promise: "beto does not register", by: cast.member, ...registered, then: { refused: cause } };
      const offered = (state: { by: string }) => (state.by === cast.member ? cause : undefined);
      const refuses = [...register.refuses, cause];
      return { ...tool, acts: { ...tool.acts, register: { ...register, offered, refuses, cases: [closed] } } };
    });
    const program = { ...settlingShop, registry };
    const checks = [...promisedChecks(program, shopShown), ...walkedChecks(program, shopShown)];
    const mine = checks.filter(check => check.name.includes("beto does not register"));
    expect(mine.map(check => check.name.split(" · ").at(-1))).toEqual([
      "beto does not register",
      "beto does not register, by keys",
      "beto does not register, blocked choices",
      "beto does not register, no empty first choice",
      "beto does not register, hidden for who prefers not to see what cannot be done",
    ]);
    expect(await failing(mine, [])).toEqual([]);
  });

  describe("a tool that says a bare number beside its name fails its cases: a count says what it counts", () => {
    const registry = settlingShop.registry.map(tool =>
      tool.id === "sales" ? { ...tool, summary: () => String(tool.targets.length) } : tool,
    );
    const why: string[] = [];
    for (const check of promisedChecks({ ...settlingShop, registry }, shopShown))
      it(check.name, async () => {
        await check.run().catch((error: unknown) => why.push(String(error)));
      });
    afterAll(() => {
      expect(why.length).toBeGreaterThan(0);
      expect(why.filter(said => !said.includes("sales says a bare number beside its name"))).toEqual([]);
    });
  });
});

describe("a screen that does not say how its things are found fails every search for one, and nothing else", () => {
  const failed: string[] = [];
  for (const check of walkedChecks(settlingShop, deafShown))
    it(check.name, async () => {
      failed.push(...(await failing([check], "looking for s1 from a menu does not find it")));
    });
  afterAll(() => {
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every(name => name.endsWith("is found by its name from any menu"))).toBe(true);
    expect(failed.filter(name => name.startsWith("sales ·")).length).toBe(failed.length);
  });
});

describe("a tool that does not say what its cases promise needs someone to act fails that, on every door", () => {
  const checks = [...promisedChecks(carelessShop, shopShown), ...walkedChecks(carelessShop, shopShown)];
  const expected = [stillOwing, `${stillOwing}, in Attention with why`];
  it("derives both expected failures exactly once and in order", () => {
    expect(checks.map(check => check.name).filter(name => expected.includes(name))).toEqual(expected);
  });
  // Each check opens its own house; report and time it independently without dropping the checks that pass.
  for (const check of checks)
    it(check.name, async () => {
      expect(await failing([check], ["Attention differs from the case", "Debe $ 0,90"])).toEqual(
        expected.includes(check.name) ? [check.name] : [],
      );
    });
});
