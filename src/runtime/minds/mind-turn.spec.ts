import { expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { runMindTurn } from "./mind-turn.ts";
import type { TurnPorts } from "./mind-ports.ts";
import { act, answer, fixture, frame, ok, usage, wake } from "../../../tests/support/mind-turn-fixture.ts";
it("applies with a fixed author, records the close and uses four layers through the exact port", async () => {
  const f = fixture([ok()]);
  const result = await runMindTurn(f.ports, wake);
  expect(result).toMatchObject({ outcome: "done", calls: 1, applied: [expect.any(String)] });
  expect(f.execute).toHaveBeenCalledOnce();
  expect(f.model.mock.calls[0]?.[0]).toMatchObject({ mind: wake.scope.actor, turn: wake.id, number: 1, frame });
  expect(f.execute.mock.calls[0]?.[1].turn.scope).toEqual(wake.scope);
  expect(f.events.every(event => event.by === wake.scope.actor && event.process === undefined)).toBe(true);
  expect(f.state().turns.get("t1")?.closed?.data.calls).toBe(1);
});
it.each(["json", "schema", "max_tokens", "refusal"] as const)("corrects a single invalid %s", async reason => {
  const f = fixture([{ kind: "invalid", reason, usage }, ok()]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "done", calls: 2 });
  expect(f.events.filter(e => e.kind === "mind-answer-invalid")).toHaveLength(1);
});
const asking = { ...answer, consultation: { question: "¿Sigo?" } };
it("rejects an invented by and shares the correction with a consultation rejected afterwards", async () => {
  const f = fixture([ok({ ...answer, by: "other" }), ok(asking)]);
  f.ports.supervision.rules = {
    review: request => ({
      proposal: request.id,
      through: request.through,
      rulesVersion: "v1",
      outcome: "rejected",
      text: "No corresponde",
    }),
  };
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 2, reason: "rejected" });
  expect(f.execute).not.toHaveBeenCalled();
});
it("a rejected consultation followed by an invalid one gets no third call", async () => {
  const f = fixture([ok(asking), { kind: "invalid", reason: "json" }]);
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
it("holds back the consultation's acts and replaces the proposal after no supervisor", async () => {
  const f = fixture([ok({ ...answer, consultation: { question: "¿Sigo?" } }), ok({ ...answer, acts: [] })]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "done", calls: 2 });
  expect(f.execute).not.toHaveBeenCalled();
  expect(f.events.find(e => e.kind === "mind-consultation-answered")?.data).toMatchObject({
    answer: "Sin supervisor",
    source: "unconfigured",
  });
});
it("the consultation does not restore a used correction, and a second consultation is invalid", async () => {
  const queried = ok({ ...answer, consultation: { question: "¿Sigo?" } });
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
it("stops on uncertainty and does not record as done acts it did not do", async () => {
  const f = fixture([{ kind: "uncertain" }, ok()]);
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "interrupted", calls: 1, applied: [] });
  expect(f.model).toHaveBeenCalledOnce();
});
it("closes before calling when the frame does not fit", async () => {
  const f = fixture([]);
  expect(await runMindTurn({ ...f.ports, frame: () => ({ tooLarge: true }) }, wake)).toMatchObject({
    outcome: "failed",
    calls: 0,
    reason: "frame-too-large",
  });
});
it("a program mind completes the same turn protocol", async () => {
  const f = fixture([ok()]);
  const result = await runMindTurn(f.ports, { ...wake, scope: { kind: "consciousness", actor: "mind:chat" } });
  expect(result).toMatchObject({ outcome: "done", calls: 1 });
  expect(f.execute).toHaveBeenCalledOnce();
  expect(f.events.every(event => event.by === "mind:chat")).toBe(true);
});

it("discards a late answer when closing while it waited", async () => {
  const f = fixture([]);
  const model = async () => {
    await Promise.resolve();

    f.deactivate();
    return ok();
  };
  expect(await runMindTurn({ ...f.ports, model }, wake)).toMatchObject({ outcome: "interrupted" });
  expect(f.execute).not.toHaveBeenCalled();
});
it("revokes while waiting for the consultation and discards an answer with expired rules", async () => {
  for (const invalidate of ["revoke", "changeRules"] as const) {
    const f = fixture([ok(asking)]);
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
    expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", reason: "review-failed" });
    expect(f.execute).not.toHaveBeenCalled();
  }
});
it("cuts the batch when an act fails and keeps the ones already applied", async () => {
  const f = fixture([ok({ ...answer, acts: [act, act, act] })]);
  let count = 0;
  const execute: TurnPorts["execute"] = async () => {
    await Promise.resolve();
    return ++count === 1 ? { status: "accepted", id: "a1" } : { status: "rejected", id: "a2" };
  };
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({ outcome: "failed", applied: ["a1"] });
  expect(count).toBe(2);
});
it("pins the journey's process in every fact", async () => {
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
it("writes no late facts when the turn was already closed while calling", async () => {
  const f = fixture([]);
  const model = () => {
    f.emit(effect("mind-turn-closed", { turn: "t1", outcome: "interrupted", calls: 1, applied: [] }, wake.scope.actor));
    return Promise.resolve(ok());
  };
  expect(await runMindTurn({ ...f.ports, model }, wake)).toMatchObject({ outcome: "interrupted" });
  expect(f.events.map(e => e.kind)).toEqual(["mind-turn-opened", "mind-turn-closed"]);
  expect(f.execute).not.toHaveBeenCalled();
});
it("allows twelve calls in total during a consultation and holds the thirteenth", async () => {
  const f = fixture([ok(asking), ...Array.from({ length: 20 }, () => ok())]);
  f.ports.supervision.supervisor = async (request, caller) => {
    for (let i = 0; i < 12; i++) await caller.call("mind:supervisor", frame, {});
    return { proposal: request.id, through: request.through, rulesVersion: "v1", outcome: "passed", text: "Listo" };
  };
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 12, reason: "call-limit" });
  expect(f.model).toHaveBeenCalledTimes(12);
  expect(f.execute).not.toHaveBeenCalled();
});
it("if the rules change during an act, the next ones do not use the old approval", async () => {
  const f = fixture([ok({ ...answer, acts: [act, act] })]);
  const execute = vi.fn(() => {
    f.changeRules();
    return Promise.resolve({ status: "accepted" as const, id: "a1" });
  });
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({ outcome: "failed", applied: ["a1"] });
  expect(execute).toHaveBeenCalledOnce();
});
it("a consultation answered on call twelve leaves no room to go on: what was held back is not applied", async () => {
  const f = fixture([ok(asking), ...Array.from({ length: 11 }, () => ok())]);
  f.ports.supervision.supervisor = async (request, caller) => {
    for (let i = 0; i < 11; i++) await caller.call("mind:supervisor", frame, {});
    return { proposal: request.id, through: request.through, rulesVersion: "v1", outcome: "passed", text: "Listo" };
  };
  expect(await runMindTurn(f.ports, wake)).toMatchObject({ outcome: "failed", calls: 12, reason: "call-limit" });
  expect(f.execute).not.toHaveBeenCalled();
});

it("stops on an unknown action result without calling it failed or running the following action", async () => {
  const f = fixture([ok({ ...answer, acts: [act, act] })]);
  const execute = vi.fn<TurnPorts["execute"]>(() => Promise.resolve({ status: "inconclusive", id: "uncertain-act" }));
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({
    outcome: "interrupted",
    reason: "act-uncertain",
    calls: 1,
  });
  expect(execute).toHaveBeenCalledOnce();
});
it("returns a tool's refusal to the mind as a correction, then applies its adjusted answer", async () => {
  const f = fixture([ok(), ok()]);
  let count = 0;
  const execute: TurnPorts["execute"] = async () => {
    await Promise.resolve();
    return ++count === 1
      ? { status: "rejected", id: "a1", reason: "Carpeta rechazada: no existe." }
      : { status: "accepted", id: "a2" };
  };
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({ outcome: "done", applied: ["a2"] });
  expect(f.model).toHaveBeenCalledTimes(2);
  const said = f.events.flatMap(event => (event.kind === "mind-scene" ? [event.data.text] : []));
  expect(said).toContain("La propuesta necesita una corrección · Carpeta rechazada: no existe.");
});
