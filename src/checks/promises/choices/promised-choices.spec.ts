// Compiling sabotages must fail the checks derived from the test programs' own cases.
import { describe, expect, it } from "vitest";
import { choosingShop } from "../../../../tests/support/choosing-shop.ts";
import { narrowShop } from "../../../../tests/support/charging-shop.ts";
import { shopShown, type Shop } from "../../../../tests/support/shop.ts";
import { anyToolScreen } from "../../../surface/bridge/views/any-tool.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { Field, Option } from "../../../surface/contract/contract.ts";
import { choiceChecks } from "./promised-choices.ts";
import { walkedChecks } from "../walk/promised-walk.ts";
import { promisedChecks } from "../cases/promised.ts";
import { cast, staged } from "../promised-stage.ts";
import { seated, type, view } from "../promised-keys.ts";

const broken = (tool: string, change: (options: readonly Option[]) => readonly Option[]): Shown<Shop> => ({
  ...shopShown,
  screens: {
    [tool]: (ports, contract, words, acts, start) => {
      const plain = anyToolScreen(ports, contract, words, acts, start);
      const corrupt = (field: Field | null): Field | null => {
        if (field?.kind === "pick") return { ...field, found: sought => change(field.found(sought)) };
        return field?.kind === "one" ? { ...field, options: change(field.options) } : field;
      };
      return {
        ...plain,
        acts: Object.fromEntries(
          Object.entries(plain.acts).map(([name, act]) => [
            name,
            { ...act, next: answers => corrupt(act.next(answers)) },
          ]),
        ),
      };
    },
  },
});
const sabotages = [
  {
    name: "removes blocked rows",
    why: "A blocked choice is missing",
    change: (rows: readonly Option[]) => rows.filter(row => !row.off),
  },
  {
    name: "enables blocked rows",
    why: "A blocked choice is enabled",
    change: (rows: readonly Option[]) => rows.map(row => ({ ...row, off: false })),
  },
  {
    name: "erases the reason",
    why: "A blocked choice lost its reason",
    change: (rows: readonly Option[]) => rows.map(row => ({ ...row, detail: "" })),
  },
];
describe("choices checked before choosing", () => {
  for (const check of [...promisedChecks(choosingShop, shopShown), ...walkedChecks(choosingShop, shopShown)])
    it(check.name, check.run);
  for (const sabotage of sabotages) {
    it(`fails when a compiling surface ${sabotage.name}`, async () => {
      for (const [program, tool] of [
        [choosingShop, "sales"],
        [narrowShop, "payments"],
      ] as const) {
        const checks = choiceChecks(program, broken(tool, sabotage.change));
        const failed: string[] = [];
        for (const check of checks)
          await check.run().catch((error: unknown) => {
            expect(error, check.name).toBeInstanceOf(Error);
            expect(error instanceof Error && error.message, check.name).toContain(sabotage.why);
            failed.push(check.name);
          });
        expect(failed).toHaveLength(tool === "payments" ? 3 : 2);
      }
    });
  }
  it("rejects a compiling program that returns an empty reason instead of explaining a blocked thing", async () => {
    const program = {
      ...narrowShop,
      registry: narrowShop.registry.map(tool => ({
        ...tool,
        acts: Object.fromEntries(
          Object.entries(tool.acts).map(([name, act]) => [
            name,
            act.among ? { ...act, among: () => ({ sales: () => "" }) } : act,
          ]),
        ),
      })),
    };
    const checks = choiceChecks(program, shopShown).filter(check => check.name.startsWith("payments · charge ·"));
    expect(checks).toHaveLength(3);
    for (const check of checks)
      await expect(check.run()).rejects.toMatchObject({ detail: "An act refused with a cause it does not declare: " });
  });
  it("opens on the eligible option, ignores the disabled key, and never runs that rejection", () =>
    staged(choosingShop, async ({ house }) => {
      const seat = seated(house(), cast.admin, shopShown);
      try {
        type(seat.router, "vcw");
        const before = seat.router.screen(view);
        expect(before.body).toMatchObject({
          options: [
            { title: "Nube", off: true, detail: "ya conectado · Nube", selected: false },
            { title: "Mercado", selected: true },
          ],
        });
        type(seat.router, "n");
        expect(seat.router.screen(view)).toEqual(before);
        seat.router.send({ kind: "up" });
        expect(seat.router.screen(view).body).toMatchObject({ options: [{ selected: false }, { selected: true }] });
        seat.router.send({ kind: "confirm" });
        await seat.router.idle();
        expect(JSON.stringify(seat.router.screen(view))).toContain("Conectado · Canal");
      } finally {
        seat.router.stop();
      }
    }));
});
