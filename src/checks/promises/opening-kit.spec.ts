// The suggestion check reads an act as the screen reads it for whoever the case runs as: outside their kit the row is
// off, so its suggestion is never computed; with the act in the kit the same suggestion is checked and fails.
import { expect, it, vi } from "vitest";
import { openingCase, openingFixture } from "../../../tests/support/opening-cleanup.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { kitAct } from "../../tools/identities/kit-catalog.ts";
import { openingChecks } from "./cases/opening-checks.ts";
import { actRow, seated } from "./promised-keys.ts";
import { cast, given, staged } from "./promised-stage.ts";

/** The member's kit for charge: taken away, or taken away and given back, so both cases carry a kit fact. */
function fixture(charge: "taken" | "given back") {
  const kit = (value: "yes" | "no") => ({
    act: kitAct("payments", "charge"),
    on: `identities/${cast.member}`,
    input: { value },
  });
  const kits = charge === "taken" ? [kit("no")] : [kit("no"), kit("yes")];
  const opens = vi.fn(() => ({ amount: 0 }));
  const { also } = openingFixture();
  const { program, aim } = openingFixture({
    cases: [{ ...openingCase, by: cast.member, given: [...kits, ...openingCase.given] }],
    also: { ...also, opens },
  });
  return { program: { ...program, identities: true }, aim, opens };
}
it("an act outside the case identity's kit is off on the screen and its suggestion is not computed", async () => {
  const { program, aim, opens } = fixture("taken");
  await staged(program, async ({ house }) => {
    await given(house(), "payments", aim.act.cases[0]?.given);
    const seat = seated(house(), cast.member, shopShown);
    try {
      const found = actRow(seat, aim, "payments", () => true, { tool: "sales", target: "sales/s1" });
      expect(found?.row).toMatchObject({ off: true, detail: toolTexts.kitRefusal("payments") });
    } finally {
      seat.router.stop();
    }
  });
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  expect(opens).not.toHaveBeenCalled();
});
it("the same act inside the kit is on, and its invalid suggestion fails naming the field and value", async () => {
  const { program, aim, opens } = fixture("given back");
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*0/u);
  expect(opens).toHaveBeenCalled();
});
