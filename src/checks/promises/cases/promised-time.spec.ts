// The declared instant reaches every refusal and every derived door; a frozen wrong clock breaks the promise.
import { describe, expect, it } from "vitest";
import { datedShop, datedShown, instant, future } from "../../../../tests/support/dated-shop.ts";
import { programChecks } from "../../program-checks.ts";
import { given, perform, staged, wroteSince } from "../promised-stage.ts";
import { wrongIn, day, holding } from "../../../fields/fields.ts";
import { Type } from "@sinclair/typebox";
import { object } from "../../../fields/visible-text.ts";

for (const mode of ["stops", "wrong", "among"] as const) {
  describe(`program time reaches ${mode}`, () => {
    const program = datedShop(mode);
    for (const check of programChecks(program, datedShown)) it(check.name, check.run);
    it("a compiling stale-clock sabotage fails both derived doors", async () => {
      const checks = programChecks(
        datedShop(mode, at => at + 86_400_000),
        datedShown,
      ).filter(check => / · tomorrow is closed(, by keys)?$/.test(check.name));
      expect(checks).toHaveLength(2);
      for (const check of checks)
        await expect(check.run()).rejects.toThrow(
          check.name.endsWith(", by keys") ? "An internal refusal could be submitted" : "día futuro",
        );
    });
    it("another door rejects tomorrow without entering run, and the same open house accepts it a day later", () =>
      staged(program, async ({ house, reopen }) => {
        const act = program.registry.find(tool => tool.id === "sales")?.acts.date;
        expect(act).toBeDefined();
        const kase = act?.cases.find(kase => kase.promise === "tomorrow is closed");
        await given(house(), "sales", kase?.given, instant);
        let runs = 0;
        if (!act) throw new Error("Missing dated act");
        const original = act.run;
        Reflect.set(act, "run", (...args: Parameters<typeof original>) => {
          runs++;
          return original(...args);
        });
        try {
          const before = house().tools.state().through;
          expect(await perform(house(), "sales", { act: "date", input: kase?.input })).toMatchObject({
            status: "rejected",
            reason: "día futuro",
          });
          expect(runs).toBe(0);
          expect(wroteSince(house(), before)).toEqual([]);
          house().pass(1);
          reopen();
          expect(house().now()).toBe(instant + 86_400_000);
          expect(await perform(house(), "sales", { act: "date", input: kase?.input })).toMatchObject({
            status: "accepted",
          });
          expect(runs).toBe(1);
        } finally {
          Reflect.set(act, "run", original);
        }
      }));
  });
}

it("wrong receives the same instant inside objects, arrays and union arms", () => {
  const field = holding(day("Día"), future);
  const input = object({ dates: Type.Array(Type.Union([field, Type.Null()])) });
  expect(wrongIn(input, { dates: [null, "2026-11-13"] }, instant)).toBe("día futuro");
  expect(wrongIn(input, { dates: [null, "2026-11-13"] }, instant + 86_400_000)).toBeUndefined();
});
