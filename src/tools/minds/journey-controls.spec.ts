import { expect, it, vi } from "vitest";
import { type HouseEmission, type HouseEvent } from "../../house/facts.ts";
import { journeyStep, type Journeys } from "../../house/minds/journey-state.ts";
import { clockStep, type Deadlines } from "../../journal/clock.ts";
import { turnLimits, type TurnContext } from "./mind-contract.ts";
import type { ReviewPort } from "./mind-review.ts";
import {
  openJourney,
  endJourney,
  desistJourney,
  writeJourneyPlan,
  completeJourneyStep,
  waitJourney,
  type JourneyControlContext,
  type JourneyControlState,
} from "./journey-controls.ts";
const actor = "assistant:beto";
const kit = [{ tool: "notes", acts: ["write"] }];
function rig() {
  let journeys: Journeys = new Map();
  let clock: Deadlines = new Map();
  const events: HouseEvent[] = [];
  const state: JourneyControlState = {
    journeys,
    kit,
    active: true,
    pending: [],
    through: 0,
    now: 1000,
    rulesVersion: "r1",
  };
  const turn: TurnContext = {
    id: "t1",
    scope: { kind: "consciousness", actor },
    language: "es",
    wake: ["cause"],
    through: 0,
    limits: turnLimits,
    usage: { calls: 0, corrections: 0, consultations: 0 },
  };
  const review = {
    review: vi.fn<ReviewPort["review"]>(request => ({
      proposal: request.id,
      through: request.through,
      rulesVersion: "r1",
      outcome: "passed",
      text: "Admitido",
    })),
  };
  const context: JourneyControlContext = { turn, cause: ["cause"], state: () => state, review };
  const apply = (facts: readonly HouseEmission[]) => {
    for (const fact of facts) {
      const event = { ...fact, id: `e${events.length + 1}`, seq: events.length + 1, at: state.now };
      journeys = journeyStep(journeys, event);
      clock = clockStep(clock, event);
      events.push(event);
    }
    Object.assign(state, { journeys, through: events.length });
  };
  const opened = async () => {
    const result = await openJourney(context, { goal: "Anotar el mate", kit });
    apply(result.facts);
    const process = result.facts[0]?.process;
    if (!process) throw new Error("Falta el proceso");
    return {
      ...context,
      turn: { ...turn, scope: { kind: "journey", actor, process, kit } },
    } satisfies JourneyControlContext;
  };
  return { state, context, review, apply, opened, events, clock: () => clock };
}
it("abre con un ID generado, revisión y autor fijo; no emite hasta que el turno aplica", async () => {
  const r = rig();
  const result = await openJourney(r.context, { goal: "Anotar el mate", kit });
  expect(result.review.outcome).toBe("passed");
  expect(r.events).toEqual([]);
  expect(result.facts).toHaveLength(1);
  expect(result.facts[0]).toMatchObject({ kind: "journey-opened", by: actor, cause: ["cause"], data: { kit } });
  expect(result.facts[0]?.process).not.toBe(actor);
  expect(result.facts[0]?.process).toMatch(/^journey:/);
  expect(r.review.review).toHaveBeenCalledOnce();
  expect(r.review.review).toHaveBeenCalledWith(
    expect.objectContaining({
      reason: "open",
      scope: r.context.turn.scope,
      turn: r.context.turn,
      acts: [{ act: "open", target: actor, input: { goal: "Anotar el mate", kit } }],
    }),
  );
  r.apply(result.facts);
  expect(r.state.journeys.size).toBe(1);
});
it.each([
  [undefined, "input"],
  [{ kit }, "goal"],
  [{ goal: "Mate" }, "kit"],
  [{ goal: " ", kit }, "goal"],
  [{ goal: "x".repeat(4001), kit }, "goal"],
  [{ goal: "Mate", kit, process: "inventado" }, "process"],
  [{ goal: "Mate", kit, by: "ana" }, "by"],
  [{ goal: "Mate", kit: [...kit, ...kit] }, "kit"],
  [{ goal: "Mate", kit: [{ tool: "notes", acts: ["write", "write"] }] }, "kit"],
  [{ goal: "Mate", kit: [{ tool: "notes", acts: ["delete"] }] }, "kit"],
])("rechaza apertura inválida antes de revisar %#", async (input, field) => {
  const r = rig();
  await expect(openJourney(r.context, input)).rejects.toThrow(field);
  expect(r.review.review).not.toHaveBeenCalled();
});
it("rechaza identidades, otra apertura desde un journey y mente inactiva", async () => {
  const r = rig();
  const context = await r.opened();
  await expect(openJourney(context, { goal: "Otro", kit })).rejects.toThrow("scope");
  const invalid = { ...r.context, turn: { ...r.context.turn } };
  Object.assign(invalid.turn, { scope: { kind: "consciousness", actor: "beto" } });
  await expect(openJourney(invalid, { goal: "Otro", kit })).rejects.toThrow("actor");
  Object.assign(r.state, { active: false });
  await expect(openJourney(r.context, { goal: "Otro", kit })).rejects.toThrow("active");
});
it("escribe un plan una vez y completa pasos por ID en cualquier orden", async () => {
  const r = rig();
  const c = await r.opened();
  const plan = {
    steps: [
      { id: "one", text: "Preparar" },
      { id: "two", text: "Anotar" },
    ],
  };
  r.apply(writeJourneyPlan(c, plan));
  expect(() => writeJourneyPlan(c, plan)).toThrow("plan");
  expect(() => completeJourneyStep(c, { step: "absent", note: "No" })).toThrow("step");
  r.apply(completeJourneyStep(c, { step: "two", note: "Anotado" }));
  expect(() => completeJourneyStep(c, { step: "two", note: "Otra vez" })).toThrow("step");
  r.apply(completeJourneyStep(c, { step: "one", note: "Preparado" }));
  expect([...r.state.journeys.values()][0]?.steps.map(step => step.note)).toEqual(["Preparado", "Anotado"]);
  expect(r.events.slice(1).every(event => event.cause.includes("e1") && event.by === actor)).toBe(true);
  expect(r.review.review).toHaveBeenCalledOnce();
});
it("rechaza planes vacíos, IDs repetidos y argumentos faltantes sin efectos", async () => {
  const r = rig();
  const c = await r.opened();
  expect(() => writeJourneyPlan(c, { steps: [] })).toThrow("steps");
  expect(() =>
    writeJourneyPlan(c, {
      steps: [
        { id: "s", text: "Uno" },
        { id: "s", text: "Dos" },
      ],
    }),
  ).toThrow("steps");
  expect(() => completeJourneyStep(c, { step: "s" })).toThrow("note");
  expect(() => waitJourney(c, { what: "Respuesta" })).toThrow("until");
  expect(r.events).toHaveLength(1);
});
it("persiste espera y reloj, los reconstruye, reemplaza la espera y cancela al cerrar", async () => {
  const r = rig();
  const c = await r.opened();
  r.apply(waitJourney(c, { what: "Respuesta", until: 2000 }));
  expect(r.clock().get(c.turn.scope.process)?.at).toBe(2000);
  r.apply(waitJourney(c, { what: "Otra respuesta", until: 3000 }));
  expect(r.clock().size).toBe(1);
  expect(r.events.reduce(journeyStep, new Map())).toEqual(r.state.journeys);
  expect(r.events.reduce(clockStep, new Map())).toEqual(r.clock());
  const result = await endJourney(c, { summary: "Quedó anotado", references: ["note:1"] });
  expect(result.facts.map(fact => fact.kind)).toEqual(["journey-closed", "wake-at"]);
  r.apply(result.facts);
  expect(r.clock().size).toBe(0);
  expect([...r.state.journeys.values()][0]?.closed?.data).toEqual({
    outcome: "done",
    summary: "Quedó anotado",
    references: ["note:1"],
  });
  expect(r.events.reduce(journeyStep, new Map())).toEqual(r.state.journeys);
  expect(r.review.review).toHaveBeenCalledTimes(2);
  await expect(endJourney(c, { summary: "Duplicado", references: [] })).rejects.toThrow("active");
  expect(() => waitJourney(c, { what: "Tarde", until: 4000 })).toThrow("active");
  expect(r.review.review).toHaveBeenCalledTimes(2);
});
it.each([0, 999, 1000, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
  "rechaza espera sin futuro o sin instante seguro: %s",
  async until => {
    const r = rig();
    const c = await r.opened();
    expect(() => waitJourney(c, { what: "Respuesta", until })).toThrow("until");
  },
);
it("desiste con motivo y referencias; el cierre es la única devolución a consciencia", async () => {
  const r = rig();
  const c = await r.opened();
  const result = await desistJourney(c, { reason: "Falta el dato", references: [] });
  expect(result.facts).toHaveLength(1);
  expect(result.facts[0]).toMatchObject({
    kind: "journey-closed",
    data: {
      outcome: "desisted",
      summary: "Falta el dato",
      references: [],
    },
  });
  r.apply(result.facts);
  await expect(desistJourney(c, { reason: "Otra vez", references: [] })).rejects.toThrow("active");
});
it("aísla dos journeys de la misma mente y rechaza operar uno ajeno", async () => {
  const r = rig();
  const first = await r.opened();
  const second = await r.opened();
  expect(first.turn.scope.process).not.toBe(second.turn.scope.process);
  r.apply(writeJourneyPlan(first, { steps: [{ id: "s", text: "Anotar" }] }));
  r.apply((await endJourney(first, { summary: "Listo", references: [] })).facts);
  expect(r.state.journeys.get(second.turn.scope.process)?.closed).toBeUndefined();
  const other: JourneyControlContext = {
    ...second,
    turn: { ...second.turn, scope: { ...second.turn.scope, actor: "mind:notes" } },
  };
  expect(() => waitJourney(other, { what: "Ajeno", until: 2000 })).toThrow("active");
});
it.each([
  { control: "end", close: endJourney, input: { summary: "Listo", references: [] } },
  { control: "desist", close: desistJourney, input: { reason: "No sigo", references: [] } },
])("impide $control con actos propios abiertos", async ({ close, input }) => {
  const r = rig();
  const c = await r.opened();
  Object.assign(r.state, { pending: [{ by: actor, process: c.turn.scope.process }] });
  await expect(close(c, input)).rejects.toThrow("pending");
  expect(r.review.review).toHaveBeenCalledOnce();
});
it("no confunde actos de otro journey con los propios al cerrar", async () => {
  const r = rig();
  const c = await r.opened();
  Object.assign(r.state, { pending: [{ by: actor, process: "another" }] });
  expect((await endJourney(c, { summary: "Listo", references: [] })).facts).toHaveLength(1);
});
it("funciona también para la mente de una herramienta", async () => {
  const r = rig();
  const turn: TurnContext = { ...r.context.turn, scope: { kind: "consciousness", actor: "mind:notes" } };
  const result = await openJourney({ ...r.context, turn }, { goal: "Anotar", kit });
  expect(result.facts[0]?.by).toBe("mind:notes");
});
it.each(["turn", "cause", "state", "review"])("nombra el argumento de contexto ausente: %s", async field => {
  const r = rig();
  const context = Object.assign({ ...r.context }, { [field]: undefined });
  await expect(openJourney(context, { goal: "Anotar", kit })).rejects.toThrow(field);
  expect(r.review.review).not.toHaveBeenCalled();
});
it.each(["journeys", "kit", "active", "pending", "through", "now", "rulesVersion"])(
  "nombra el campo de estado ausente: %s",
  async field => {
    const r = rig();
    Object.assign(r.state, { [field]: undefined });
    await expect(openJourney(r.context, { goal: "Anotar", kit })).rejects.toThrow(field);
    expect(r.review.review).not.toHaveBeenCalled();
  },
);
it("también rechaza el cierre desde consciencia y el proceso sin journey", async () => {
  const r = rig();
  await expect(endJourney(r.context, { summary: "Listo", references: [] })).rejects.toThrow("scope");
  const c = await r.opened();
  const absent = { ...c, turn: { ...c.turn, scope: { ...c.turn.scope, process: "absent" } } };
  expect(() => writeJourneyPlan(absent, { steps: [{ id: "s", text: "Anotar" }] })).toThrow("active");
  await expect(desistJourney(absent, { reason: "No existe", references: [] })).rejects.toThrow("active");
});
