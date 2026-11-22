import { explicitKit, programKit } from "../../house/kit-selection.ts";
import { expect, it } from "vitest";
import { type HouseEmission, type HouseEvent } from "../../house/facts.ts";
import { journeyStep, type Journeys } from "../../house/minds/journey-state.ts";
import { clockStep, type Deadlines } from "../../journal/clock.ts";
import { turnLimits, type TurnContext } from "./mind-contract.ts";
import {
  openJourney,
  endJourney,
  desistJourney,
  writeJourneyPlan,
  completeJourneyStep,
  waitJourney,
  resumeJourney,
  interruptJourney,
  JourneyStopRefused,
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
    notices: () => "none",
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
  const context: JourneyControlContext = { turn, cause: ["cause"], state: () => state };
  const apply = (facts: readonly HouseEmission[]) => {
    for (const fact of facts) {
      const event = { ...fact, id: `e${events.length + 1}`, seq: events.length + 1, at: state.now };
      journeys = journeyStep(journeys, event);
      clock = clockStep(clock, event);
      events.push(event);
    }
    Object.assign(state, { journeys, through: events.length });
  };
  const opened = () => {
    const facts = openJourney(context, { goal: "Anotar el mate", kit });
    apply(facts);
    const process = facts[0]?.process;
    if (!process) throw new Error("Falta el proceso");
    return {
      ...context,
      turn: { ...turn, scope: { kind: "journey", actor, process, kit } },
    } satisfies JourneyControlContext;
  };
  return { state, context, apply, opened, events, clock: () => clock };
}
/** Which plan mistake a control refused, or the error it threw instead. */
const refused = (run: () => unknown): unknown => {
  try {
    return run();
  } catch (error) {
    return error instanceof Error && "problem" in error ? error.problem : error;
  }
};
it("abre con un ID generado y autor fijo, sin esperar al supervisor; no emite hasta que el turno aplica", () => {
  const r = rig();
  const facts = openJourney(r.context, { goal: "Anotar el mate", kit });
  const result = { facts };
  expect(r.events).toEqual([]);
  expect(result.facts).toHaveLength(1);
  expect(result.facts[0]).toMatchObject({
    kind: "journey-opened",
    by: actor,
    cause: ["cause"],
    data: { version: 2, kit: explicitKit(kit) },
  });
  expect(result.facts[0]?.process).not.toBe(actor);
  expect(result.facts[0]?.process).toMatch(/^journey:/);
  r.apply(result.facts);
  expect(r.state.journeys.size).toBe(1);
});
it.each([
  [undefined, "input"],
  [{ kit }, "goal"],
  [{ goal: "Mate" }, "kit"],
  [{ goal: " ", kit }, "goal"],
  [{ goal: "x".repeat(4001), kit }, "goal"],
  [{ goal: "Mate", kit, process: "invented" }, "process"],
  [{ goal: "Mate", kit, by: "ana" }, "by"],
  [{ goal: "Mate", kit: [...kit, ...kit] }, "kit"],
  [{ goal: "Mate", kit: [{ tool: "notes", acts: ["write", "write"] }] }, "kit"],
  [{ goal: "Mate", kit: [{ tool: "notes", acts: ["delete"] }] }, "kit"],
])("rechaza apertura inválida %#", (input, field) => {
  const r = rig();
  expect(() => openJourney(r.context, input)).toThrow(field);
  expect(r.events).toEqual([]);
});
it("rechaza identidades, otra apertura desde un journey y mente inactiva", () => {
  const r = rig();
  const context = r.opened();
  expect(() => openJourney(context, { goal: "Otro", kit })).toThrow("scope");
  const invalid = { ...r.context, turn: { ...r.context.turn } };
  Object.assign(invalid.turn, { scope: { kind: "consciousness", actor: "beto" } });
  expect(() => openJourney(invalid, { goal: "Otro", kit })).toThrow("actor");
  Object.assign(r.state, { active: false });
  expect(() => openJourney(r.context, { goal: "Otro", kit })).toThrow("active");
});
it("escribe un plan una vez y completa pasos por ID en cualquier orden", () => {
  const r = rig();
  const c = r.opened();
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
  expect(refused(() => writeJourneyPlan(c, plan))).toBe("planned");
  expect(refused(() => completeJourneyStep(c, { step: "absent", note: "No" }))).toBe("missing");
  expect(refused(() => completeJourneyStep(c, { step: "two", note: "Otra vez" }))).toBe("done");
  r.apply(completeJourneyStep(c, { step: "one", note: "Preparado" }));
  expect([...r.state.journeys.values()][0]?.steps.map(step => step.note)).toEqual(["Preparado", "Anotado"]);
  expect(r.events.slice(1).every(event => event.cause.includes("e1") && event.by === actor)).toBe(true);
});
it("rechaza planes vacíos, IDs repetidos y argumentos faltantes sin efectos", () => {
  const r = rig();
  const c = r.opened();
  expect(() => writeJourneyPlan(c, { steps: [] })).toThrow("steps");
  expect(() =>
    writeJourneyPlan(c, {
      steps: [
        { id: "s", text: "Uno" },
        { id: "s", text: "Dos" },
      ],
    }),
  ).toThrow("steps");
  const twice = { id: "s", text: "Uno" };
  expect(refused(() => writeJourneyPlan(c, { steps: [twice, twice] }))).toBe("repeated");
  expect(() => completeJourneyStep(c, { step: "s" })).toThrow("note");
  expect(() => waitJourney(c, { what: "Respuesta" })).toThrow("until");
  expect(r.events).toHaveLength(1);
});
it("persiste espera y reloj, los reconstruye, reemplaza la espera y cancela al cerrar", () => {
  const r = rig();
  const c = r.opened();
  r.apply(waitJourney(c, { what: "Respuesta", until: 2000 }));
  expect(r.clock().get(c.turn.scope.process)?.at).toBe(2000);
  r.apply(waitJourney(c, { what: "Otra respuesta", until: 3000 }));
  expect(r.clock().size).toBe(1);
  expect(r.events.reduce(journeyStep, new Map())).toEqual(r.state.journeys);
  expect(r.events.reduce(clockStep, new Map())).toEqual(r.clock());
  const closing = endJourney(c, { summary: "Quedó anotado", references: ["note:1"] });
  expect(closing.map(fact => fact.kind)).toEqual(["journey-closed", "wake-at"]);
  r.apply(closing);
  expect(r.clock().size).toBe(0);
  expect([...r.state.journeys.values()][0]?.closed?.data).toEqual({
    outcome: "done",
    summary: "Quedó anotado",
    references: ["note:1"],
  });
  expect(r.events.reduce(journeyStep, new Map())).toEqual(r.state.journeys);
  expect(() => endJourney(c, { summary: "Duplicado", references: [] })).toThrow("active");
  expect(() => waitJourney(c, { what: "Tarde", until: 4000 })).toThrow("active");
});
it.each([0, 999, 1000, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
  "rechaza espera sin futuro o sin instante seguro: %s",
  until => {
    const r = rig();
    const c = r.opened();
    expect(() => waitJourney(c, { what: "Respuesta", until })).toThrow("until");
  },
);
it("desiste con motivo y referencias; el cierre es la única devolución a consciencia", () => {
  const r = rig();
  const c = r.opened();
  const facts = desistJourney(c, { reason: "Falta el dato", references: [] });
  expect(facts).toHaveLength(1);
  expect(facts[0]).toMatchObject({
    kind: "journey-closed",
    data: {
      outcome: "desisted",
      summary: "Falta el dato",
      references: [],
    },
  });
  r.apply(facts);
  expect(() => desistJourney(c, { reason: "Otra vez", references: [] })).toThrow("active");
});
it("aísla dos journeys de la misma mente y rechaza operar uno ajeno", () => {
  const r = rig();
  const first = r.opened();
  const second = r.opened();
  expect(first.turn.scope.process).not.toBe(second.turn.scope.process);
  r.apply(writeJourneyPlan(first, { steps: [{ id: "s", text: "Anotar" }] }));
  r.apply(endJourney(first, { summary: "Listo", references: [] }));
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
])("impide $control con actos propios abiertos", ({ close, input }) => {
  const r = rig();
  const c = r.opened();
  Object.assign(r.state, { pending: [{ by: actor, process: c.turn.scope.process }] });
  expect(() => close(c, input)).toThrow("pending");
});
it("no confunde actos de otro journey con los propios al cerrar", () => {
  const r = rig();
  const c = r.opened();
  Object.assign(r.state, { pending: [{ by: actor, process: "another" }] });
  expect(endJourney(c, { summary: "Listo", references: [] })).toHaveLength(1);
});
it("funciona también para la mente de una herramienta", () => {
  const r = rig();
  const turn: TurnContext = { ...r.context.turn, scope: { kind: "consciousness", actor: "mind:notes" } };
  const facts = openJourney({ ...r.context, turn }, { goal: "Anotar", kit });
  expect(facts[0]?.by).toBe("mind:notes");
});
it.each(["turn", "cause", "state"])("nombra el argumento de contexto ausente: %s", field => {
  const r = rig();
  const context = Object.assign({ ...r.context }, { [field]: undefined });
  expect(() => openJourney(context, { goal: "Anotar", kit })).toThrow(field);
});
it.each(["journeys", "kit", "active", "pending", "through", "now", "rulesVersion"])(
  "nombra el campo de estado ausente: %s",
  field => {
    const r = rig();
    Object.assign(r.state, { [field]: undefined });
    expect(() => openJourney(r.context, { goal: "Anotar", kit })).toThrow(field);
  },
);
it("también rechaza el cierre desde consciencia y el proceso sin journey", () => {
  const r = rig();
  expect(() => endJourney(r.context, { summary: "Listo", references: [] })).toThrow("scope");
  const c = r.opened();
  const absent = { ...c, turn: { ...c.turn, scope: { ...c.turn.scope, process: "absent" } } };
  expect(() => writeJourneyPlan(absent, { steps: [{ id: "s", text: "Anotar" }] })).toThrow("active");
  expect(() => desistJourney(absent, { reason: "No existe", references: [] })).toThrow("active");
});

it("opens a folder journey in V2 without freezing its action list", () => {
  const r = rig();
  const kit = programKit(["notes"]);
  const facts = openJourney(r.context, { version: 2, goal: "Anotar", kit });
  expect(facts[0]).toMatchObject({ kind: "journey-opened", data: { version: 2, goal: "Anotar", kit } });
  r.apply(facts);
  expect([...r.state.journeys.values()][0]?.selections).toEqual(kit);
});
it("the supervisor stops an open journey of any mind; a second stop is refused with words until it is resumed", () => {
  const r = rig();
  const c = r.opened();
  const process = c.turn.scope.process;
  const supervisor: JourneyControlContext = {
    ...r.context,
    turn: { ...r.context.turn, scope: { kind: "consciousness", actor: "mind:supervisor" } },
  };
  expect(() => interruptJourney(r.context, { reason: "Pará" }, process)).toThrow("scope.actor");
  const stop = interruptJourney(supervisor, { reason: "Falta el permiso de Franco" }, process);
  expect(stop[0]).toMatchObject({ kind: "journey-interrupted", by: "mind:supervisor", process });
  r.apply(stop);
  expect(r.state.journeys.get(process)?.interrupted).toEqual({ reason: "Falta el permiso de Franco", frozen: true });
  expect(() => interruptJourney(supervisor, { reason: "Otra vez" }, process)).toThrow(JourneyStopRefused);
  r.apply(resumeJourney(r.context, { note: "Pedile el permiso a Franco" }, process));
  expect(r.state.journeys.get(process)?.interrupted).toEqual({ reason: "Falta el permiso de Franco", frozen: false });
  r.apply(interruptJourney(supervisor, { reason: "Todavía no" }, process));
  r.apply(desistJourney(r.context, { reason: "Sin permiso", references: [] }, process));
  expect(() => interruptJourney(supervisor, { reason: "Ya cerró" }, process)).toThrow("active");
  expect(r.events.reduce(journeyStep, new Map())).toEqual(r.state.journeys);
});
