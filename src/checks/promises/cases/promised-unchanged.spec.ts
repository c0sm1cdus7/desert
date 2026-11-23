// The same unchanged fact, declared by stops or calculated from today, closes at the person's keys.
import { describe, expect, it } from "vitest";
import { unchangedShop } from "../../../../tests/support/unchanged-shop.ts";
import { shopShown, type Shop } from "../../../../tests/support/shop.ts";
import { programChecks } from "../../program-checks.ts";
import { cast, given, staged } from "../promised-stage.ts";
import { seated, type, view } from "../promised-keys.ts";
import { anyToolScreen } from "../../../surface/bridge/views/any-tool.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { Field } from "../../../surface/contract/contract.ts";
import { markedCurrent } from "../../../surface/session/current-field.ts";

for (const mode of ["one", "text", "pick"] satisfies readonly ("one" | "text" | "pick")[]) {
  describe(`unchanged ${mode} from the program`, () => {
    const program = unchangedShop(mode);
    for (const check of programChecks(program, shopShown)) it(check.name, check.run);
    it("leaves the unchanged answer unsent, says actual only on that option and permits another", () =>
      staged(program, async ({ house }) => {
        await given(
          house(),
          "sales",
          ["s1", "s2"].map(sale => ({ act: "register", input: { sale, total: 100 } })),
        );
        const seat = seated(house(), cast.admin, shopShown);
        try {
          type(seat.router, "pap");
          const before = seat.router.screen(view);
          if (mode === "text") type(seat.router, "old");
          else {
            const options = before.body.kind === "thread" ? (before.body.options ?? []) : [];
            const current = options.filter(option => option.detail === "current");
            expect(current).toHaveLength(1);
            expect(current[0]).toMatchObject({ off: true, title: mode === "pick" ? "s1" : "Anterior" });
            type(seat.router, mode === "pick" ? "2" : "a");
            expect(seat.router.screen(view)).toEqual(before);
          }
          if (mode === "text") {
            expect(seat.router.screen(view).hints.some(hint => hint.intent === "confirm")).toBe(false);
            seat.router.send({ kind: "confirm" });
          }
          expect(JSON.stringify(seat.router.screen(view))).not.toContain("sin cambios");
          expect(seat.requests).toEqual([]);
          if (mode === "text") {
            for (let count = 0; count < 3; count++) seat.router.send({ kind: "erase" });
            type(seat.router, "new");
            seat.router.send({ kind: "confirm" });
          } else type(seat.router, mode === "pick" ? "1" : "n");
          await seat.router.idle();
          expect(seat.requests.filter(request => request.act === "adjust")).toHaveLength(1);
          expect(JSON.stringify(seat.router.screen(view))).toContain("Done");
        } finally {
          seat.router.stop();
        }
      }));
  });
}
it("an unrelated prohibition on today's option retains its own reason", () => {
  const field: Field = { ask: "Valor", kind: "one", current: "Anterior", only: true, options: [] };
  expect(markedCurrent(field, { title: "Anterior", off: true, detail: "cerrado" })).toMatchObject({
    detail: "cerrado",
  });
  expect(markedCurrent(field, { title: "Nuevo" }).detail).toBeUndefined();
});

it("fails the derived guarantee when a compiling screen turns current back into a refusal label", async () => {
  const shown: Shown<Shop> = {
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
                  return field?.kind === "one"
                    ? {
                        ...field,
                        options: field.options.map(option =>
                          option.detail === "current" ? { ...option, detail: "no changes" } : option,
                        ),
                      }
                    : field;
                },
              },
            ]),
          ),
        };
      },
    },
  };
  const checks = programChecks(unchangedShop("one"), shown).filter(
    check => check.name.startsWith("payments · adjust ·") && check.name.endsWith(", blocked choices"),
  );
  expect(checks).toHaveLength(3);
  for (const check of checks)
    await expect(check.run()).rejects.toMatchObject({ actual: "no changes", expected: "current" });
});
