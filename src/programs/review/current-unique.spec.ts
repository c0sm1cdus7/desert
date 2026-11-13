// Even without today, two distinct unchanged answers are a program defect before either can be chosen.
import { expect, it } from "vitest";
import { unchangedShop } from "../../../tests/support/unchanged-shop.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { choiceChecks } from "../promised-choices.ts";
import { cast, given, staged } from "../promised-stage.ts";
import { seated, type, view } from "../promised-keys.ts";

for (const mode of ["one", "pick"] as const) {
  const honest = unchangedShop(mode);
  const program = {
    ...honest,
    registry: honest.registry.map(tool => ({
      ...tool,
      acts: Object.fromEntries(
        Object.entries(tool.acts).map(([name, act]) => [
          name,
          name === "adjust"
            ? {
                ...act,
                stops: (value: Readonly<Record<string, unknown>>) => (value.value ? toolTexts.unchanged : undefined),
              }
            : act,
        ]),
      ),
    })),
  };
  it(`${mode}: records the defect while painting without sending an answer`, () =>
    staged(program, async ({ house }) => {
      await given(
        house(),
        "sales",
        ["s1", "s2"].map(sale => ({ act: "register", input: { sale, total: 100 } })),
      );
      const seat = seated(house(), cast.admin, shopShown);
      try {
        type(seat.router, "pap");
        expect(JSON.stringify(seat.router.screen(view))).toContain("E-PROG-1");
        expect(seat.requests).toEqual([]);
        expect(seat.defects).toHaveLength(1);
        expect(JSON.stringify(house().tools.state().entries)).toContain(
          "Two answers of the same question are unchanged",
        );
      } finally {
        seat.router.stop();
      }
    }));
  it(`${mode}: every derived choice case rejects the ambiguous current answer`, async () => {
    const checks = choiceChecks(program, shopShown).filter(check => check.name.startsWith("payments · adjust ·"));
    expect(checks).toHaveLength(3);
    for (const check of checks)
      await expect(check.run()).rejects.toMatchObject({
        detail: "Two answers of the same question are unchanged",
      });
  });
}
