import { expect, it, vi } from "vitest";
import { Bus } from "../../journal/bus.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { effect } from "../../house/facts.ts";
import { startMindSchedule, pendingMindWakes } from "./mind-schedule.ts";
import type { TurnWake } from "./mind-ports.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
const policy: WakePolicy = {
  scope: { kind: "consciousness", actor: "assistant:franco" },
  name: "Nora",
  message: e =>
    e.layer === "program" && typeof e.data === "string"
      ? { text: e.data, to: ["assistant:franco"], by: e.by }
      : undefined,
  toolOf: target => target,
};
function fixture(initial: Event[] = []) {
  let events = [...initial];
  let turn = 0;
  let now = 0;
  let fire: (() => void) | undefined;
  let policies = [policy];
  const bus = new Bus(
    e => {
      const event = { ...e, seq: events.length + 1, id: `e${events.length + 1}`, at: now };
      events.push(event);
      return event;
    },
    work => {
      const before = [...events];
      try {
        return work();
      } catch (error) {
        events = before;
        throw error;
      }
    },
  );
  const calls: TurnWake[] = [];
  let during: (() => Promise<void>) | undefined;
  const failed = vi.fn();
  const ports = {
    bus,
    history: () => events,
    policies: () => policies,
    language: "es" as const,
    time: {
      now: () => now,
      wait: (_at: number, callback: () => void) => {
        fire = callback;
        return () => {
          fire = undefined;
        };
      },
    },
    nextId: () => `t${++turn}`,
    emit: (e: Parameters<typeof bus.emit>[0]) => {
      bus.emit(e);
    },
    failed,
    run: async (wake: TurnWake) => {
      calls.push(wake);
      bus.emit(
        effect("mind-turn-opened", { turn: wake.id, wake: wake.wake }, wake.scope.actor, [], wake.scope.process),
      );
      if (during) await during();
      bus.emit(
        effect(
          "mind-turn-closed",
          { turn: wake.id, outcome: "done", calls: 1, applied: [] },
          wake.scope.actor,
          [],
          wake.scope.process,
        ),
      );
    },
  };
  const say = (text: string) => bus.emit({ layer: "program", kind: "said", data: text, by: "martin", cause: [] });
  return {
    ports,
    say,
    calls,
    events: () => events,
    setDuring: (work: () => Promise<void>) => {
      during = work;
    },
    setPolicies: (value: WakePolicy[]) => {
      policies = value;
    },
    advance: (value: number) => {
      now = value;
      fire?.();
    },
  };
}
it("no despierta en reposo y agrupa dos mensajes confirmados", async () => {
  const f = fixture();
  const schedule = startMindSchedule(f.ports);
  await schedule.flush();
  expect(f.calls).toHaveLength(0);
  const first = f.say("Nora, hola");
  const second = f.say("Nora, otra cosa");
  await schedule.flush();
  expect(f.calls.map(c => c.wake)).toEqual([[first.id, second.id]]);
  schedule.close();
});
it("una llegada durante un turno espera al siguiente sin superponer ejecuciones", async () => {
  const f = fixture();
  let active = 0;
  let maximum = 0;
  f.setDuring(async () => {
    active++;
    maximum = Math.max(maximum, active);
    if (f.calls.length === 1) f.say("Nora, llegó otra cosa");
    await Promise.resolve();
    active--;
  });
  const schedule = startMindSchedule(f.ports);
  f.say("Nora");
  await schedule.flush();
  expect(f.calls).toHaveLength(2);
  expect(maximum).toBe(1);
  schedule.close();
});
it("una transacción deshecha no despierta", async () => {
  const f = fixture();
  const schedule = startMindSchedule(f.ports);
  expect(() =>
    f.ports.bus.together(() => {
      f.say("Nora");
      throw new Error("Deshacer");
    }),
  ).toThrow();
  await schedule.flush();
  expect(f.calls).toHaveLength(0);
  schedule.close();
});
it("cerrar justo al despertar conserva el pendiente para la reapertura y no lo duplica después", async () => {
  const f = fixture();
  const first = startMindSchedule(f.ports);
  const event = f.say("Nora");
  first.close();
  await first.flush();
  expect(f.calls).toHaveLength(0);
  const second = startMindSchedule(f.ports);
  await second.flush();
  expect(f.calls[0]?.wake).toEqual([event.id]);
  second.close();
  const third = startMindSchedule(f.ports);
  await third.flush();
  expect(f.calls).toHaveLength(1);
  third.close();
});
it("recupera un turno abierto como interrumpido y nunca repite su llamada incierta", async () => {
  const f = fixture();
  const event = f.say("Nora");
  f.ports.bus.emit(effect("mind-turn-opened", { turn: "old", wake: [event.id] }, policy.scope.actor));
  f.ports.bus.emit(
    effect(
      "model-call-reserved",
      { call: "c1", turn: "old", number: 1, account: "test", maximumNanoUsd: 1 },
      policy.scope.actor,
    ),
  );
  f.ports.bus.emit(effect("model-call-started", { call: "c1" }, policy.scope.actor));
  f.ports.bus.emit(effect("model-call-uncertain", { call: "c1" }, policy.scope.actor));
  const schedule = startMindSchedule(f.ports);
  await schedule.flush();
  expect(f.calls).toHaveLength(0);
  expect(f.events().find(e => e.kind === "mind-turn-closed")?.data).toMatchObject({ outcome: "interrupted", calls: 1 });
  schedule.close();
});
it.each(["assistant:franco", "mind:notes"] as const)("vence la espera de %s sin repetir al reiniciar", async actor => {
  const f = fixture();
  const journey = { ...policy, scope: { kind: "journey" as const, actor, process: "j1", kit: [] } };
  f.setPolicies([journey]);
  const event = f.ports.bus.emit(effect("journey-waiting", { what: "La hora", until: 10 }, actor, [], "j1"));
  const schedule = startMindSchedule(f.ports);
  await schedule.flush();
  expect(f.calls).toHaveLength(0);
  f.advance(10);
  await schedule.flush();
  expect(f.calls.map(c => c.wake)).toEqual([[event.id]]);
  schedule.close();
  const second = startMindSchedule(f.ports);
  await second.flush();
  expect(f.calls).toHaveLength(1);
  second.close();
});
it("las casas anteriores sin hechos de mentes no inventan despertares", () => {
  const event = { ...effect("boot", {}, "franco"), seq: 1, id: "e1", at: 0 };
  expect(pendingMindWakes([policy], [event], 0)).toEqual([]);
});
it("dos journeys mantienen separados los despertares y la autoría del proceso", async () => {
  const f = fixture();
  f.setPolicies(
    ["j1", "j2"].map(process => ({
      ...policy,
      scope: { kind: "journey", actor: policy.scope.actor, process, kit: [] },
    })),
  );
  for (const process of ["j1", "j2"])
    f.ports.bus.emit(effect("journey-opened", { goal: "Anotar", kit: [] }, policy.scope.actor, [], process));
  const schedule = startMindSchedule(f.ports);
  await schedule.flush();
  expect(f.calls.map(wake => [wake.scope.process, wake.wake])).toEqual([
    ["j1", ["e1"]],
    ["j2", ["e2"]],
  ]);
  schedule.close();
});
it("la recuperación conserva los actos aceptados y deja pendientes las llegadas posteriores", async () => {
  const f = fixture();
  const first = f.say("Nora, uno");
  f.ports.bus.emit(effect("mind-turn-opened", { turn: "old", wake: [first.id] }, policy.scope.actor));
  const act = f.ports.bus.emit(effect("act", { object: "chat", option: "say", input: {} }, policy.scope.actor));
  f.ports.bus.emit(effect("act-result", { act: act.id, status: "accepted", reason: "Listo" }, policy.scope.actor));
  const later = f.say("Nora, dos");
  const schedule = startMindSchedule(f.ports);
  await schedule.flush();
  expect(f.events().find(e => e.kind === "mind-turn-closed")?.data).toMatchObject({ applied: [act.id], calls: 0 });
  expect(f.calls.map(w => w.wake)).toEqual([[later.id]]);
  schedule.close();
});
it("la agenda conecta una mente de programa y no repite el despertar", async () => {
  const f = fixture();
  f.setPolicies([{ ...policy, scope: { kind: "consciousness", actor: "mind:notes" } }]);
  f.ports.bus.emit(effect("act", { object: "notes", option: "write", input: {} }, "franco"));
  const schedule = startMindSchedule(f.ports);
  await schedule.flush();
  expect(f.calls).toHaveLength(1);
  expect(f.calls[0]?.scope).toEqual({ kind: "consciousness", actor: "mind:notes" });
  schedule.notify();
  await schedule.flush();
  expect(f.calls).toHaveLength(1);
  schedule.close();
});
it("una falla del puerto queda visible y no provoca un ciclo automático de reintentos", async () => {
  const f = fixture();
  f.say("Nora");
  const run = vi.fn(() => Promise.reject(new Error("Falla sintética")));
  const schedule = startMindSchedule({ ...f.ports, run });
  await expect(schedule.flush()).rejects.toThrow("falla interna");
  f.say("Nora, otra vez");
  await expect(schedule.flush()).rejects.toThrow();
  expect(run).toHaveBeenCalledOnce();
  expect(f.ports.failed).toHaveBeenCalledOnce();
  schedule.close();
});
it("rechaza una segunda agenda activa sobre el mismo diario", async () => {
  const f = fixture();
  const schedule = startMindSchedule(f.ports);
  expect(() => startMindSchedule(f.ports)).toThrow("schedule.concurrent");
  await schedule.flush();
  schedule.close();
});
it("una espera fallida con otra llegada en curso no reintenta el turno", async () => {
  const f = fixture();
  f.say("Nora");
  const run = vi.fn(async () => {
    f.say("Nora, otra llegada");
    await Promise.resolve();
    throw new Error("Corte");
  });
  const schedule = startMindSchedule({ ...f.ports, run });
  await expect(schedule.flush()).rejects.toThrow();
  expect(run).toHaveBeenCalledOnce();
  schedule.close();
});
