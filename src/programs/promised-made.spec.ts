// Returning from a maker rechecks the receiving question against the updated house before accepting the answer.
import { describe, expect, it } from "vitest";
import { makingRegistry } from "../../tests/support/charging-shop.ts";
import { shopProgram, shopShown, type Shop } from "../../tests/support/shop.ts";
import type { Composition, ProgramTool } from "../tools/promises.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { seated, type, view } from "./promised-keys.ts";
import { programChecks } from "./program-checks.ts";

const reason = "venta no elegible";
type Mode = "among" | "stops" | "valid" | "allowed" | "empty";
function madeShop(mode: Mode): Composition<Shop> {
  const original: readonly ProgramTool<Shop>[] = makingRegistry;
  const registry = original.map((tool): ProgramTool<Shop> => {
    if (tool.id === "sales") {
      const register = tool.acts.register;
      if (!register) throw new Error("Missing maker");
      const maker = { ...register };
      const run = maker.run;
      if (mode === "empty")
        Reflect.set(maker, "run", (...args: Parameters<typeof run>) => {
          const [input] = args;
          return typeof input === "object" && input !== null && Reflect.get(input, "sale") === "s3"
            ? { status: "accepted", text: "Sin novedades" }
            : run(...args);
        });
      return {
        ...tool,
        acts: { ...tool.acts, register: maker },
        closed: (_state, target) => mode === "valid" && target === "sales/s3",
      };
    }
    const charge = tool.acts.charge;
    if (!charge) throw new Error("Missing charge");
    return {
      ...tool,
      acts: {
        ...tool.acts,
        charge: {
          ...charge,
          refuses: mode === "among" || mode === "stops" ? [...charge.refuses, reason] : charge.refuses,
          cases:
            mode === "among" || mode === "stops"
              ? [
                  ...charge.cases,
                  {
                    promise: "blocks the newly eligible candidate",
                    given: [{ act: "register", on: "sales", input: { sale: "s3", total: 700 } }],
                    input: { sale: "sales/s3", amount: 1 },
                    then: { refused: reason },
                  },
                ]
              : charge.cases,
          among: () => ({ sales: value => (mode === "among" && value === "sales/s3" ? reason : undefined) }),
          stops: (answers, ...rest) =>
            mode === "stops" && answers.sale === "sales/s3" ? reason : charge.stops?.(answers, ...rest),
        },
      },
    };
  });
  return { ...shopProgram, registry };
}
for (const mode of ["among", "stops", "valid", "allowed", "empty"] satisfies readonly Mode[]) {
  describe(`a newly made answer: ${mode}`, () => {
    it("checks the new thing at the same question, keeping its visible refusal and never sending the parent", () =>
      staged(madeShop(mode), async ({ house }) => {
        await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }]);
        const seat = seated(house(), cast.admin, shopShown);
        try {
          type(seat.router, "pcrs3");
          seat.router.send({ kind: "confirm" });
          type(seat.router, "700");
          seat.router.send({ kind: "confirm" });
          await seat.router.idle();
          expect(JSON.stringify(seat.router.screen(view))).toContain("Listo");
          seat.router.send({ kind: "cancel" });
          const screen = seat.router.screen(view);
          expect(screen.title).toBe("Cobrar");
          expect(seat.requests.filter(request => request.act === "charge")).toHaveLength(0);
          if (mode === "allowed") {
            expect(JSON.stringify(screen.body)).toContain("Monto");
            return;
          }
          expect(JSON.stringify(screen.body)).not.toContain("Monto");
          if (mode === "empty") {
            expect(house().tools.state().tools.sales.has("s3")).toBe(false);
            return;
          }
          const why = mode === "valid" ? "datos inválidos" : reason;
          expect(screen.body.kind === "thread" && screen.body.options).toContainEqual(
            expect.objectContaining({ title: "s3", off: true, detail: why }),
          );
          expect(
            screen.body.kind === "thread" &&
              screen.body.events.some(
                event => event.nested && event.text.some(span => span.text === why && span.tone === "t3"),
              ),
          ).toBe(true);
          type(seat.router, " s3");
          const found = seat.router.screen(view);
          seat.router.send({ kind: "confirm" });
          expect(seat.router.screen(view)).toEqual(found);
          expect(JSON.stringify(found)).not.toContain("Error");
        } finally {
          seat.router.stop();
        }
      }));
  });
}
// The parent still meets the base's derived guarantees; adding a maker cannot bypass any declared refusal.
for (const mode of ["allowed", "among", "stops"] satisfies readonly Mode[])
  for (const check of programChecks(madeShop(mode), shopShown)) it(`${mode}: ${check.name}`, check.run);
