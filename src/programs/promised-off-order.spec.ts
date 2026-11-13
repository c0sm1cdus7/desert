// The same reason is asserted on the row and by every guarantee, including rows from another tool.
import { describe, expect, it } from "vitest";
import { offShop, offWords, type OffMode } from "../../tests/support/off-shop.ts";
import type { ProgramTool } from "../tools/promises.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { genericTexts } from "../texts/generic-surface.texts.ts";
import { withoutChoices } from "../surface/bridge/picked.ts";
import { actionOff } from "../surface/availability/action-off.ts";
import { actRow, seated } from "./promised-keys.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { promisedChecks } from "./promised.ts";
import { walkedChecks } from "./promised-walk.ts";

for (const mode of ["offered", "also"] satisfies readonly OffMode[]) {
  const program = offShop(mode);
  describe(`one disabled reason: ${mode}`, () => {
    for (const check of [...promisedChecks(program), ...walkedChecks(program, shopShown)]) it(check.name, check.run);
    it("shows the explicit reason on the row even with no eligible answer", () =>
      staged(program, async ({ house }) => {
        const tool = program.registry.find(tool => tool.id === "payments");
        const act = tool?.acts.charge;
        const kase = act?.cases[0];
        if (!tool || !act || !kase) throw new Error("Missing charge case");
        await given(house(), tool.id, kase.given);
        const seat = seated(house(), cast.admin, shopShown);
        try {
          const from = mode === "also" ? { tool: "sales", target: "sales/s2" } : undefined;
          const found = actRow(seat, { tool, act, name: "charge" }, tool.id, undefined, from);
          expect(found?.row).toMatchObject({ off: true, detail: offWords[mode] });
          const origin = { tool: "sales", target: "sales/s2" };
          const supplied = actRow(seat, { tool, act, name: "charge" }, tool.id, undefined, origin);
          expect(supplied?.row).toMatchObject({ off: true, detail: offWords[mode] });
          const surface = seat.tools.find(tool => tool.id === "payments")?.acts.charge;
          expect(withoutChoices(surface?.next(mode === "also" ? ["50"] : []) ?? null)).toBe(offWords.empty);
          const first = () => {
            throw new Error("Lower priority question must not be read");
          };
          const state = seat.state();
          expect(actionOff(act, state, tool.id, tool.id, seat.now(), first, "sales/s2")).toBe(offWords[mode]);
          expect(actionOff(act, { ...state, by: cast.outsider }, tool.id, tool.id, seat.now(), first)).toBe(
            genericTexts.notHeld,
          );
        } finally {
          seat.router.stop();
        }
      }));
  });
}

it("keeps the state reason on a thing whose only candidate is itself", () => {
  const source = offShop("offered");
  const charge = source.registry.find(tool => tool.id === "payments")?.acts.charge;
  if (!charge) throw new Error("Missing charge");
  const { also, ...own } = charge;
  expect(also).toBeDefined();
  const registry = source.registry.map((tool): ProgramTool<Shop> =>
    tool.id === "sales"
      ? {
          ...tool,
          acts: { ...tool.acts, link: { ...own, on: "thing", key: "u" } },
        }
      : tool,
  );
  return staged({ ...source, registry }, async ({ house }) => {
    await given(house(), "sales", [{ act: "register", input: { sale: "s2", total: 90 } }]);
    const seat = seated(house(), cast.admin, shopShown);
    try {
      const act = seat.tools.find(tool => tool.id === "sales")?.actsOn?.link;
      expect(withoutChoices(act?.next([], "sales/s2") ?? null)).toBe(offWords.empty);
      expect(act?.off?.("sales/s2")).toBe(offWords.offered);
    } finally {
      seat.router.stop();
    }
  });
});
