import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { effect, type HouseEmission, type HouseEvent } from "../../house/facts.ts";
import { emptyMindState, mindStep } from "../../house/minds/mind-state.ts";
import { runMindTurn } from "./mind-turn.ts";
import type { MindFrame, ModelOutcome, TurnPorts, TurnWake } from "./mind-ports.ts";
const frame: MindFrame = { layers: ["Casa", "Nora", "Herramientas", "Reglas"], changing: "Pedido" };
const usage = { input: 1, output: 1, cacheWrite: 0, cacheRead: 0 };
const act = { act: "say", target: "chat", input: { text: "Listo" } };
const answer = { scene: "Preparando", consulta: null, acts: [act] };
const ok = (value: unknown = answer): ModelOutcome => ({ kind: "answer", value, usage });
const wake: TurnWake = {
  id: "t1",
  scope: { kind: "consciousness", actor: "assistant:franco" },
  language: "es",
  wake: ["e1"],
  through: 1,
};
function fixture(outcomes: ModelOutcome[]) {
  let state = emptyMindState;
  let active = true;
  let allowed = true;
  let version = "v1";
  const events: HouseEvent[] = [];
  const emit = (emission: HouseEmission) => {
    const event = { ...emission, id: `e${events.length + 2}`, seq: events.length + 2, at: 0 };
    state = mindStep(state, event);
    events.push(event);
  };
  const model = vi.fn<TurnPorts["model"]>(async () => {
    await Promise.resolve();

    const value = outcomes.shift();
    if (!value) throw new Error("Sin respuesta falsa");
    return value;
  });
  const execute = vi.fn<TurnPorts["execute"]>(async () => {
    await Promise.resolve();
    return { status: "accepted" as const, id: `a${events.length}` };
  });
  const ports: TurnPorts = {
    isOpen: id => !!state.turns.get(id) && !state.turns.get(id)?.closed,
    frame: () => frame,
    model,
    emit,
    execute,
    read: () => ({
      active,
      through: events.length + 1,
      rulesVersion: version,
      menu: [
        {
          tool: "chat",
          act: "say",
          target: "chat",
          input: Type.Object({ text: Type.String() }),
          scope: "communication",
        },
      ],
    }),
    allowed: () => allowed,
    reviewReason: () => "world",
    supervision: {},
  };
  return {
    ports,
    model,
    execute,
    events,
    state: () => state,
    deactivate: () => {
      active = false;
    },
    revoke: () => {
      allowed = false;
    },
    changeRules: () => {
      version = "v2";
    },
    emit,
  };
}
it("aplica con autor fijado, registra cierre y usa cuatro capas por el puerto exacto", async () => {
  const f = fixture([ok()]);
  const result = await runMindTurn(f.ports, wake);
  expect(result).toMatchObject({ outcome: "done", calls: 1, applied: [expect.any(String)] });
  expect(f.execute).toHaveBeenCalledOnce();
  expect(f.model.mock.calls[0]?.[0]).toMatchObject({ mind: wake.scope.actor, turn: wake.id, number: 1, frame });
  expect(f.execute.mock.calls[0]?.[1].turn.scope).toEqual(wake.scope);
  expect(f.events.every(event => event.by === wake.scope.actor && event.process === undefined)).toBe(true);
  expect(f.state().turns.get("t1")?.closed?.data.calls).toBe(1);
});
it.each(["json", "schema", "max_tokens", "refusal"] as const)("corrige una sola inválida %s", async reason => {
  const f = fixture([{ kind: "invalid", reason, usage }, ok()]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "done", calls: 2 });
  expect(f.events.filter(e => e.kind === "mind-answer-invalid")).toHaveLength(1);
});
it("rechaza by inventado y comparte la corrección con una negativa posterior", async () => {
  const f = fixture([ok({ ...answer, by: "otro" }), ok()]);
  f.ports.supervision.rules = {
    review: request => ({
      proposal: request.id,
      through: request.through,
      rulesVersion: "v1",
      outcome: "rejected",
      text: "No corresponde",
    }),
  };
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 2 });
  expect(f.execute).not.toHaveBeenCalled();
});
it("una negativa seguida de una inválida no obtiene una tercera llamada", async () => {
  const f = fixture([ok(), { kind: "invalid", reason: "json" }]);
  f.ports.supervision.rules = {
    review: request => ({
      proposal: request.id,
      through: request.through,
      rulesVersion: "v1",
      outcome: "rejected",
      text: "No corresponde",
    }),
  };
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 2 });
  expect(f.execute).not.toHaveBeenCalled();
});
it("retiene los actos de consulta y reemplaza la propuesta después de sin supervisor", async () => {
  const f = fixture([ok({ ...answer, consulta: { question: "¿Sigo?" } }), ok({ ...answer, acts: [] })]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "done", calls: 2 });
  expect(f.execute).not.toHaveBeenCalled();
  expect(f.events.find(e => e.kind === "mind-consultation-answered")?.data).toMatchObject({
    answer: "Sin supervisor",
    source: "unconfigured",
  });
});
it("la consulta no restituye una corrección consumida y una segunda consulta es inválida", async () => {
  const queried = ok({ ...answer, consulta: { question: "¿Sigo?" } });
  const f = fixture([{ kind: "invalid", reason: "schema" }, queried, queried]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 3 });
  expect(f.execute).not.toHaveBeenCalled();
});
it.each(["http", "transport"] as const)("no reintenta %s", async reason => {
  const f = fixture([{ kind: "failed", reason }, ok()]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 1 });
  expect(f.model).toHaveBeenCalledOnce();
});
it.each(["cap", "no-key", "no-card"] as const)("cierra %s sin consumir intento", async reason => {
  const f = fixture([{ kind: "not-sent", reason }]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 0, reason });
  expect(f.events.some(e => e.kind === "mind-scene")).toBe(true);
});
it("se detiene ante incertidumbre y no registra como terminados actos que no hizo", async () => {
  const f = fixture([{ kind: "uncertain" }, ok()]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "interrupted", calls: 1, applied: [] });
  expect(f.model).toHaveBeenCalledOnce();
});
it("cierra antes de llamar cuando el marco no entra", async () => {
  const f = fixture([]);
  expect(await runMindTurn({ ...f.ports, frame: () => ({ tooLarge: true }) }, wake)).toMatchObject({
    outcome: "failed",
    calls: 0,
    reason: "frame-too-large",
  });
});
it("una mente de programa completa el mismo protocolo de turno", async () => {
  const f = fixture([ok()]);
  const result = await runMindTurn(f.ports, { ...wake, scope: { kind: "consciousness", actor: "mind:chat" } });
  expect(result).toMatchObject({ outcome: "done", calls: 1 });
  expect(f.execute).toHaveBeenCalledOnce();
  expect(f.events.every(event => event.by === "mind:chat")).toBe(true);
});

it("descarta una respuesta tardía al cerrar mientras esperaba", async () => {
  const f = fixture([]);
  const model = async () => {
    await Promise.resolve();

    f.deactivate();
    return ok();
  };
  expect(await runMindTurn({ ...f.ports, model }, wake)).toMatchObject({ outcome: "interrupted" });
  expect(f.execute).not.toHaveBeenCalled();
});
it("revoca al esperar revisión y descarta aprobación con reglas vencidas", async () => {
  for (const invalidate of ["revoke", "changeRules"] as const) {
    const f = fixture([ok()]);
    f.ports.supervision.supervisor = async request => {
      await Promise.resolve();

      f[invalidate]();
      return {
        proposal: request.id,
        through: request.through,
        rulesVersion: "v1",
        outcome: "passed",
        text: "Admitido",
      };
    };
    expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed" });
    expect(f.execute).not.toHaveBeenCalled();
  }
});
it("corta el lote al fallar un acto y conserva los que ya aplicó", async () => {
  const f = fixture([ok({ ...answer, acts: [act, act, act] })]);
  let count = 0;
  const execute: TurnPorts["execute"] = async () => {
    await Promise.resolve();
    return ++count === 1 ? { status: "accepted", id: "a1" } : { status: "rejected", id: "a2" };
  };
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({ outcome: "failed", applied: ["a1"] });
  expect(count).toBe(2);
});
it("fija el proceso del journey en todos los hechos", async () => {
  const f = fixture([ok({ ...answer, acts: [] })]);
  await runMindTurn(f.ports, {
    ...wake,
    scope: { kind: "journey", actor: "assistant:franco", process: "j1", kit: [] },
  });
  expect(f.events.every(event => event.process === "j1")).toBe(true);
});
it("emite un cierre compatible con los hechos de etapa 1", () => {
  expect(effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 0, applied: [] }, wake.scope.actor).by).toBe(
    "assistant:franco",
  );
});
it("no escribe hechos tardíos cuando el turno ya fue cerrado mientras llamaba", async () => {
  const f = fixture([]);
  const model = () => {
    f.emit(effect("mind-turn-closed", { turn: "t1", outcome: "interrupted", calls: 1, applied: [] }, wake.scope.actor));
    return Promise.resolve(ok());
  };
  expect(await runMindTurn({ ...f.ports, model }, wake)).toMatchObject({ outcome: "interrupted" });
  expect(f.events.map(e => e.kind)).toEqual(["mind-turn-opened", "mind-turn-closed"]);
  expect(f.execute).not.toHaveBeenCalled();
});
it("permite doce llamadas totales durante una revisión y frena la decimotercera", async () => {
  const f = fixture(Array.from({ length: 20 }, () => ok()));
  f.ports.supervision.supervisor = async (request, caller) => {
    for (let i = 0; i < 12; i++) await caller.call("mind:supervisor", frame, {});
    return { proposal: request.id, through: request.through, rulesVersion: "v1", outcome: "passed", text: "Listo" };
  };
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 12, reason: "call-limit" });
  expect(f.model).toHaveBeenCalledTimes(12);
  expect(f.execute).not.toHaveBeenCalled();
});
it("si cambian las reglas durante un acto, los siguientes no usan la aprobación vieja", async () => {
  const f = fixture([ok({ ...answer, acts: [act, act] })]);
  const execute = vi.fn(() => {
    f.changeRules();
    return Promise.resolve({ status: "accepted" as const, id: "a1" });
  });
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({ outcome: "failed", applied: ["a1"] });
  expect(execute).toHaveBeenCalledOnce();
});
it("la llamada doce permite terminar y una consulta sin lugar para continuar no aplica lo retenido", async () => {
  for (const consultation of [false, true]) {
    const value = consultation ? { ...answer, consulta: { question: "¿Sigo?" } } : answer;
    const f = fixture([ok(value), ...Array.from({ length: 11 }, () => ok())]);
    f.ports.supervision.supervisor = async (request, caller) => {
      for (let i = 0; i < 11; i++) await caller.call("mind:supervisor", frame, {});
      return { proposal: request.id, through: request.through, rulesVersion: "v1", outcome: "passed", text: "Listo" };
    };
    const result = await runMindTurn(f.ports, wake);
    expect(result).toMatchObject({ outcome: consultation ? "failed" : "done", calls: 12 });
    expect(f.execute).toHaveBeenCalledTimes(consultation ? 0 : 1);
  }
});
