import { afterEach, expect, it } from "vitest";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { type HouseEmission, effect } from "../../house/facts.ts";
import { clockStep } from "../../journal/clock.ts";
import { turnLimits, type TurnContext } from "./mind-contract.ts";
import {
  openJourney,
  endJourney,
  writeJourneyPlan,
  waitJourney,
  type JourneyControlContext,
} from "./journey-controls.ts";
const houses: { close(): void }[] = [];
afterEach(() => houses.splice(0).forEach(house => house.close()));
function setup() {
  const house = shopRig();
  houses.push(house);
  const cause = house.bus.emit(effect("boot", {}, "shop"));
  const turn: TurnContext = {
    id: "turn",
    scope: { kind: "consciousness", actor: "assistant:beto" },
    language: "es",
    wake: [cause.id],
    through: house.state().through,
    limits: turnLimits,
    usage: { calls: 0, corrections: 0, consultations: 0 },
  };
  const context: JourneyControlContext = {
    turn,
    cause: [cause.id],
    state: () => ({
      journeys: house.state().house.journeys,
      kit: [],
      active: true,
      pending: [],
      through: house.state().through,
      now: Date.now(),
      rulesVersion: "r1",
    }),
    review: {
      review: request => ({
        proposal: request.id,
        through: request.through,
        rulesVersion: "r1",
        outcome: "passed",
        text: "Admitido",
      }),
    },
  };
  const apply = (facts: readonly HouseEmission[]) => house.bus.together(() => facts.map(fact => house.bus.emit(fact)));
  const open = async () => {
    const result = await openJourney(context, { goal: "Recordar el mate", kit: [] });
    apply(result.facts);
    const process = result.facts[0]?.process;
    if (!process) throw new Error("Falta el proceso");
    return {
      ...context,
      turn: { ...turn, scope: { kind: "journey", actor: turn.scope.actor, process, kit: [] } },
    } satisfies JourneyControlContext;
  };
  return { house, context, apply, open };
}
it("el diario reconstruye los controles y el reloj después de reiniciar", async () => {
  const r = setup();
  const context = await r.open();
  const until = Date.now() + 60_000;
  r.apply(writeJourneyPlan(context, { steps: [{ id: "mate", text: "Esperar la confirmación" }] }));
  r.apply(waitJourney(context, { what: "Confirmación", until }));
  const before = r.house.state().house.journeys;
  const clock = r.house.facts().reduce(clockStep, new Map());
  expect(clock.get(context.turn.scope.process)?.at).toBe(until);
  r.house.restart();
  expect(r.house.state().house.journeys).toEqual(before);
  expect(r.house.facts().reduce(clockStep, new Map())).toEqual(clock);
  const result = await endJourney(context, { summary: "Confirmado", references: [] });
  r.apply(result.facts);
  r.house.restart();
  expect(r.house.facts().reduce(clockStep, new Map()).size).toBe(0);
  expect(r.house.state().house.journeys.get(context.turn.scope.process)?.closed?.data.outcome).toBe("done");
  expect(r.house.facts().filter(event => event.kind === "journey-closed")).toHaveLength(1);
});
it("un corte del lote retira tanto la espera como el reloj", async () => {
  const r = setup();
  const context = await r.open();
  const facts = waitJourney(context, { what: "Confirmación", until: Date.now() + 60_000 });
  const before = r.house.facts();
  expect(() =>
    r.house.bus.together(() => {
      r.apply(facts);
      throw new Error("Corte del lote");
    }),
  ).toThrow("Corte del lote");
  expect(r.house.facts()).toEqual(before);
  r.house.restart();
  expect(r.house.state().house.journeys.get(context.turn.scope.process)?.waiting).toBeUndefined();
  expect(r.house.facts().reduce(clockStep, new Map()).size).toBe(0);
});
it("un cierre deshecho permite volver a revisar sin una devolución duplicada", async () => {
  const r = setup();
  const context = await r.open();
  const result = await endJourney(context, { summary: "Listo", references: [] });
  expect(() =>
    r.house.bus.together(() => {
      r.apply(result.facts);
      throw new Error("Corte del lote");
    }),
  ).toThrow("Corte del lote");
  r.house.restart();
  expect(r.house.facts().filter(event => event.kind === "journey-closed")).toHaveLength(0);
  r.apply((await endJourney(context, { summary: "Listo", references: [] })).facts);
  expect(r.house.facts().filter(event => event.kind === "journey-closed")).toHaveLength(1);
});
