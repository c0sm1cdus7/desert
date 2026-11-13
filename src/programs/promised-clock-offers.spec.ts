// The house advances a day without new facts: every gate reads that same live instant again.
import { describe, expect, it } from "vitest";
import { chargingRegistry } from "../../tests/support/charging-shop.ts";
import { shopProgram, shopShown, type Shop } from "../../tests/support/shop.ts";
import { instant } from "../../tests/support/dated-shop.ts";
import type { Composition, ProgramTool } from "../tools/promises.ts";
import { cast, given, perform, staged } from "./promised-stage.ts";
import { seated, type, view } from "./promised-keys.ts";
import { localPorts } from "./house-runtime.ts";
import { asking } from "../surface/bridge/asking.ts";
import { askingClock } from "../surface/bridge/questions/asking-clock.ts";
import { formats } from "../surface/masks.ts";
import { object } from "../catalogs/acts.ts";
import { text, when } from "../catalogs/fields.ts";

type Mode = "off" | "with" | "closed";
function dated(mode: Mode): Composition<Shop> {
  const source: readonly ProgramTool<Shop>[] = chargingRegistry;
  const registry = source.map((tool): ProgramTool<Shop> => {
    if (tool.id === "sales") return { ...tool, closed: (_state, _target, at) => mode === "closed" && at === instant };
    const charge = tool.acts.charge;
    if (!charge?.also) throw new Error("Missing charge");
    const also = charge.also;
    return {
      ...tool,
      acts: {
        ...tool.acts,
        charge: {
          ...charge,
          also: {
            ...also,
            with: (state, target, at) => (mode === "with" && at === instant ? undefined : also.with(state, target, at)),
            off: (state, target, at) =>
              mode === "off" && at === instant ? "día cerrado" : also.off?.(state, target, at),
          },
        },
      },
    };
  });
  return { ...shopProgram, registry };
}
for (const mode of ["off", "with", "closed"] satisfies readonly Mode[]) {
  describe(`time reaches ${mode}`, () => {
    it("changes availability on the same screen when only the clock advances", () =>
      staged(dated(mode), async ({ house }) => {
        await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }], instant);
        const seat = seated(house(), cast.admin, shopShown);
        try {
          type(seat.router, mode === "closed" ? "p" : "v1");
          const rows = () => {
            const { body } = seat.router.screen(view);
            return body.kind === "list" ? body.stacks.flatMap(stack => stack.rows) : [];
          };
          const row = () => rows().find(row => row.title === "cobrar");
          if (mode === "with") expect(row()).toBeUndefined();
          else
            expect(row()).toMatchObject({
              off: true,
              detail: mode === "off" ? "día cerrado" : "sin ventas para cobrar",
            });
          const through = house().tools.state().through;
          house().pass(1);
          expect(row()).toBeDefined();
          expect(row()?.off).not.toBe(true);
          expect(house().tools.state().through).toBe(through);
        } finally {
          seat.router.stop();
        }
      }));
  });
}
it("when and wrong share the instant and the calendar, including while deriving input", () => {
  let now = instant;
  const clock = askingClock(
    () => now,
    at => new Date(at - 3 * 3_600_000).toISOString().slice(0, 10),
  );
  const input = object({ name: when(text("Nombre", "Nombre"), (_answers, at) => at > instant) });
  const ask = asking(input, { ...clock, formats: formats(shopShown.locale), optionalMark: "" });
  expect(ask.next([])).toBeNull();
  expect(ask.answers({ name: "Ana" })).toEqual([]);
  expect(clock.today()).toBe("2026-11-12");
  now += 86_400_000;
  expect(ask.next([])?.ask).toBe("Nombre");
  expect(ask.answers({ name: "Ana" })).toEqual(["Ana"]);
  expect(clock.today()).toBe("2026-11-13");
});
it("today and draft receive the execution instant instead of consulting a second clock", () => {
  const seen: number[] = [];
  const source: readonly ProgramTool<Shop>[] = chargingRegistry;
  const registry = source.map((tool): ProgramTool<Shop> => {
    const charge = tool.acts.charge;
    if (!charge) return tool;
    return {
      ...tool,
      draft: (_state, _through, _input, _target, at) => {
        seen.push(at);
        return undefined;
      },
      acts: {
        ...tool.acts,
        charge: {
          ...charge,
          today: (_state, _target, at) => {
            seen.push(at);
            return at === instant ? { sale: "sales/s1", amount: 100 } : undefined;
          },
        },
      },
    };
  });
  return staged({ ...shopProgram, registry }, async ({ house }) => {
    await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }], instant);
    const action = { act: "charge", input: { sale: "sales/s1", amount: 100 } };
    expect(await perform(house(), "payments", action)).toMatchObject({ reason: "sin cambios" });
    expect(seen).toEqual([instant, instant]);
    house().pass(1);
    seen.length = 0;
    expect(await perform(house(), "payments", action)).toMatchObject({ status: "accepted" });
    expect(seen).toEqual([instant + 86_400_000, instant + 86_400_000]);
  });
});
it("a local surface inherits its house's clock without an override", () =>
  staged(shopProgram, ({ house }) => {
    const ports = localPorts(house(), cast.admin, { recentLines: 10 });
    house().setTime(instant);
    expect(ports.now()).toBe(instant);
    house().pass(1);
    expect(ports.now()).toBe(instant + 86_400_000);
    return Promise.resolve();
  }));
