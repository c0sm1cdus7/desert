import { explicitKit } from "../../house/kit-selection.ts";
import { expect, it, vi } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { journeyStep } from "../../house/minds/journey-state.ts";
import { turnLimits, type TurnContext } from "./mind-contract.ts";
import type { ReviewRequest, ReviewResult } from "./mind-review.ts";
import {
  openJourney,
  endJourney,
  desistJourney,
  type JourneyControlContext,
  type JourneyControlState,
} from "./journey-controls.ts";
const actor = "assistant:beto";
const kit = [{ tool: "notes", acts: ["write"] }];
const passed = (request: ReviewRequest): ReviewResult => ({
  proposal: request.id,
  through: request.through,
  rulesVersion: "r1",
  outcome: "passed",
  text: "Admitido",
});
function rig() {
  const opened = { ...effect("journey-opened", { goal: "Anotar", kit }, actor, [], "j1"), id: "e1", seq: 1, at: 0 };
  const state: JourneyControlState = {
    journeys: journeyStep(new Map(), opened),
    kit,
    active: true,
    pending: [],
    through: 1,
    now: 1000,
    rulesVersion: "r1",
  };
  const turn: TurnContext = {
    id: "t1",
    scope: { kind: "consciousness", actor },
    language: "es",
    wake: ["e1"],
    through: 1,
    limits: turnLimits,
    usage: { calls: 0, corrections: 0, consultations: 0 },
  };
  const review = { review: vi.fn<(request: ReviewRequest) => ReviewResult | Promise<ReviewResult>>(passed) };
  const context: JourneyControlContext = { turn, cause: ["e1"], state: () => state, review };
  const journey: JourneyControlContext = {
    ...context,
    turn: { ...turn, scope: { kind: "journey", actor, process: "j1", kit } },
  };
  return { state, context, journey, review };
}
const operations = ["open", "end", "desist"] as const;
function call(r: ReturnType<typeof rig>, operation: (typeof operations)[number]) {
  if (operation === "open") return openJourney(r.context, { goal: "Anotar", kit });
  if (operation === "end") return endJourney(r.journey, { summary: "Listo", references: [] });
  return desistJourney(r.journey, { reason: "Falta el dato", references: [] });
}
it.each(operations)("%s pasa una vez por el puerto y conserva el contador compartido", async operation => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    if (!request.turn) throw new Error("Falta el turno");
    request.turn.usage.calls += 1;
    return passed(request);
  });
  const result = await call(r, operation);
  expect(result.facts).toHaveLength(1);
  expect(r.context.turn.usage.calls).toBe(1);
  expect(r.review.review).toHaveBeenCalledOnce();
  expect(r.review.review.mock.calls[0]?.[0].reason).toBe(operation);
});
it.each(operations)("%s no devuelve hechos ante rechazo ni falla de revisión", async operation => {
  const r = rig();
  for (const outcome of ["rejected", "failed"] as const) {
    r.review.review.mockImplementation(request => ({ ...passed(request), outcome, text: "No se aprobó" }));
    const result = await call(r, operation);
    expect(result.review.outcome).toBe(outcome);
    expect(result.facts).toEqual([]);
  }
  expect(r.state.journeys.size).toBe(1);
});
it.each(operations)("%s propaga la falla del puerto sin aprobar ni reintentar", async operation => {
  const r = rig();
  r.review.review.mockRejectedValue(new Error("Revisión interrumpida"));
  await expect(call(r, operation)).rejects.toThrow("Revisión interrumpida");
  expect(r.review.review).toHaveBeenCalledOnce();
});
it.each([
  { proposal: "otro" },
  { through: 0 },
  { rulesVersion: "otra" },
  { rulesVersion: "" },
  { text: "" },
  { outcome: "inventado" },
])("rechaza una revisión ajena, vencida o inválida %#", async patch => {
  const r = rig();
  r.review.review.mockImplementation(request => Object.assign(passed(request), patch));
  await expect(call(r, "open")).rejects.toThrow("review");
});
it.each(operations)("%s revalida la secuencia después de esperar", async operation => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    Object.assign(r.state, { through: 2 });
    return passed(request);
  });
  await expect(call(r, operation)).rejects.toThrow("review.through");
});
it.each(operations)("%s revalida la vigencia de las reglas después de esperar", async operation => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    Object.assign(r.state, { rulesVersion: "r2" });
    return passed(request);
  });
  await expect(call(r, operation)).rejects.toThrow("review.rulesVersion");
});
it("rechaza permiso retirado durante la apertura y no usa el kit anterior", async () => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    Object.assign(r.state, { kit: [] });
    return passed(request);
  });
  await expect(call(r, "open")).rejects.toThrow("kit");
});
it.each(operations)("%s rechaza una mente deshabilitada mientras revisaba", async operation => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    Object.assign(r.state, { active: false });
    return passed(request);
  });
  await expect(call(r, operation)).rejects.toThrow("active");
});
it.each(["end", "desist"] as const)("%s rechaza actos que quedaron pendientes durante revisión", async operation => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    Object.assign(r.state, { pending: [{ by: actor, process: "j1" }] });
    return passed(request);
  });
  await expect(call(r, operation)).rejects.toThrow("pending");
});
it("un cierre concurrente impide devolver otro cierre aunque llegue aprobación", async () => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    const closed = {
      ...effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, actor, [], "j1"),
      id: "e2",
      seq: 2,
      at: 1000,
    };
    Object.assign(r.state, { journeys: journeyStep(r.state.journeys, closed) });
    return passed(request);
  });
  await expect(call(r, "end")).rejects.toThrow("active");
});
it("dos aperturas simultáneas generan procesos y propuestas distintos", async () => {
  const r = rig();
  const [one, two] = await Promise.all([call(r, "open"), call(r, "open")]);
  expect(one.facts[0]?.process).not.toBe(two.facts[0]?.process);
  expect(one.review.proposal).not.toBe(two.review.proposal);
});
it("retiene una copia de la propuesta mientras el puerto espera", async () => {
  const r = rig();
  let release: (() => void) | undefined;
  const pause = new Promise<void>(resolve => {
    release = resolve;
  });
  r.review.review.mockImplementation(async request => {
    await pause;
    return passed(request);
  });
  const input = { goal: "Original", kit: [{ tool: "notes", acts: ["write"] }] };
  const pending = openJourney(r.context, input);
  input.goal = "Cambiado";
  input.kit[0]?.acts.push("delete");
  release?.();
  const result = await pending;
  expect(result.facts[0]?.data).toEqual({ version: 2, goal: "Original", kit: explicitKit(kit) });
  expect(r.review.review.mock.calls[0]?.[0].acts[0]?.input).toEqual({ goal: "Original", kit });
});
it("los hechos devueltos permiten que un lote deshecho se reconstruya sin cierre", async () => {
  const r = rig();
  const before = r.state.journeys;
  const result = await call(r, "end");
  const apply = (fact: HouseEmission) => journeyStep(before, { ...fact, id: "e2", seq: 2, at: 1000 });
  expect(result.facts.map(apply)[0]?.get("j1")?.closed).toBeDefined();
  expect(r.state.journeys).toBe(before);
  expect(before.get("j1")?.closed).toBeUndefined();
});
it("no acepta como vigente la versión de reglas cambiada por el propio puerto", async () => {
  const r = rig();
  r.review.review.mockImplementation(request => {
    Object.assign(r.state, { rulesVersion: "r2" });
    return { ...passed(request), rulesVersion: "r2" };
  });
  await expect(call(r, "open")).rejects.toThrow("review.rulesVersion");
});
