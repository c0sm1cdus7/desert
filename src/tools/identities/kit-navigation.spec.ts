import { expect, it } from "vitest";
import { staged, perform } from "../../checks/promises/promised-stage.ts";
import { seated, goTo, fitsSmallest } from "../../checks/promises/promised-keys.ts";
import { kitBoundary, boundaryShown } from "../../../tests/support/kit-boundary.ts";
import { allowedAct } from "../../house/kit.ts";
import { holderKit } from "../../house/kit-history.ts";
import { editKit } from "../../house/kit-edit.ts";
import { programKit, selectionKit } from "../../house/kit-selection.ts";
it.each([9, 10, 35])(
  "navigates programs, tools and every one of %i actions without relying on shortcuts",
  async count => {
    await staged(kitBoundary(count), async ({ house }) => {
      const seat = seated(house(), "ana", boundaryShown);
      try {
        goTo(seat, "identities", "identities/carla");
        seat.router.send({ kind: "type", text: "h" });
        seat.router.send({ kind: "confirm" });
        seat.router.send({ kind: "confirm" });
        const core = seat.tools.find(tool => tool.id === "identities");
        const actions = core
          ?.view("identities/carla#kit:sales/sales")
          .flatMap(stack => stack.rows)
          .filter(row => row.act);
        expect(actions).toHaveLength(count + 1);
        // The whole-folder row precedes the actions, so the last action takes count down presses.
        for (let i = 0; i < count; i++) seat.router.send({ kind: "down" });
        fitsSmallest(seat.router);
        expect(JSON.stringify(seat.router.screen({ rows: 8 }))).not.toContain("menú pendiente");
        seat.router.send({ kind: "confirm" });
        seat.router.send({ kind: "type", text: "s" });
        await seat.router.idle();
        expect(
          seat.requests.some(request => request.act === `kit:sales:action${count - 1}`),
          JSON.stringify(seat.router.screen({ rows: 20 })),
        ).toBe(true);
        expect(allowedAct(house().tools.state().house, "carla", "sales", `action${count - 1}`)).toBe(true);
        expect(holderKit(house().tools.state().house, "carla").selections).toHaveLength(1);
        expect(seat.defects).toEqual([]);
      } finally {
        seat.router.stop();
      }
    });
  },
);
it("splitting one inherited action preserves sibling folders, retired selections and concurrent changes", () => {
  const layout = { sales: { create: "products", edit: "products", charge: "payments" } };
  const initial = selectionKit([
    ...programKit(["sales", "notes"]).selections,
    { kind: "action", program: "old", tool: "old", action: "retired" },
  ]);
  const branch = { kind: "action" as const, program: "sales", tool: "products", action: "create" };
  const changed = editKit(initial, branch, false, ["create", "edit", "charge"], layout);
  expect(changed.selections).toEqual([
    { kind: "tool", program: "sales", tool: "payments" },
    { kind: "action", program: "sales", tool: "products", action: "edit" },
    { kind: "program", program: "notes" },
    { kind: "action", program: "old", tool: "old", action: "retired" },
  ]);
});
it("H2 rejects changing the administrator through the normal command", async () => {
  await staged(kitBoundary(10), async ({ house }) => {
    const result = await perform(house(), "identities", {
      act: "kit:sales",
      on: "identities/ana",
      input: { value: "no" },
    });
    expect(result).toMatchObject({ status: "rejected", reason: { en: "administers · all", es: "administra · todas" } });
    expect(allowedAct(house().tools.state().house, "ana", "sales", "action9")).toBe(true);
  });
});
