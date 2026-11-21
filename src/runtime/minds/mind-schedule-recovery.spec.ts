import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { vocabulary, type Event, type ProgramFacts } from "../../journal/vocabulary.ts";
import { Bus } from "../../journal/bus.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { emptyMindState, mindStep } from "../../house/minds/mind-state.ts";
import { startMindSchedule } from "./mind-schedule.ts";
import { runMindTurn } from "./mind-turn.ts";
import type { ModelPort, TurnPorts, TurnWake } from "./mind-ports.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
const actor = "assistant:franco";
const policy: WakePolicy = {
  scope: { kind: "consciousness", actor },
  name: "Nora",
  message: e =>
    e.layer === "program" && typeof e.data === "string" ? { text: e.data, to: [actor], by: e.by } : undefined,
  toolOf: target => target,
};
it.each([
  ["reserved", "assistant:franco"],
  ["started", "assistant:franco"],
  ["uncertain", "assistant:franco"],
  ["reserved", "mind:notes"],
  ["started", "mind:notes"],
  ["uncertain", "mind:notes"],
] as const)(
  "reabre SQLite después de %s de %s, interrumpe sin repetir y atiende una llegada posterior una sola vez",
  async (phase, actor) => {
    const dir = mkdtempSync(join(tmpdir(), "mind-turn-recovery-"));
    const file = join(dir, "journal.sqlite");
    const catalog = { said: Type.String() };
    const words = vocabulary(catalog);
    let journal = new SqliteJournal(file, words);
    let at = 0;
    const emission = () =>
      actor === "mind:notes"
        ? effect("act", { object: "notes", option: "write", input: {} }, "martin")
        : words.fact("said", "Nora, hola", "martin");
    const say = () => journal.append(emission(), ++at);
    try {
      const first = say();
      journal.append(effect("mind-turn-opened", { turn: "old", wake: [first.id] }, actor), ++at);
      journal.append(
        effect(
          "model-call-reserved",
          { call: "c1", turn: "old", number: 1, account: "test", maximumNanoUsd: 1 },
          actor,
        ),
        ++at,
      );
      if (phase !== "reserved") journal.append(effect("model-call-started", { call: "c1" }, actor), ++at);
      if (phase === "uncertain") journal.append(effect("model-call-uncertain", { call: "c1" }, actor), ++at);
      journal.close();
      journal = new SqliteJournal(file, words);
      const state = journal.watch("turns", emptyMindState, (state, e) =>
        e.layer === "house" ? mindStep(state, e) : state,
      );
      journal.restore();
      const bus = new Bus<ProgramFacts<typeof catalog>>(
        e => journal.append(e, ++at),
        work => journal.batch(work),
      );
      const emit = (e: HouseEmission) => {
        bus.emit(e);
      };
      const model = vi.fn<ModelPort>(() =>
        Promise.resolve({
          kind: "answer",
          value: { scene: "Listo", consulta: null, acts: [] },
          usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        }),
      );
      const turn: TurnPorts = {
        model,
        emit,
        frame: () => ({ layers: ["Casa", "Mente", "Skills", "Reglas"], changing: "Pedido" }),
        read: () => ({ active: true, menu: [], through: at, rulesVersion: "none", now: 0 }),
        allowed: () => true,
        isOpen: id => !!state().turns.get(id) && !state().turns.get(id)?.closed,
        supervision: {},
        execute: () => Promise.resolve({ status: "accepted", id: "a1" }),
      };
      const history = () => journal.replay<readonly Event[]>([], (events, event) => [...events, event]);
      let id = 0;
      const options = {
        bus,
        emit,
        history,
        policies: () => [{ ...policy, scope: { kind: "consciousness" as const, actor } }],
        language: "es" as const,
        time: { now: () => at, wait: () => () => {} },
        nextId: () => `new${++id}`,
        run: (wake: TurnWake) => runMindTurn(turn, wake),
        failed: () => {
          throw new Error("Falló la agenda");
        },
      };
      const schedule = startMindSchedule(options);
      await schedule.flush();
      expect(model).not.toHaveBeenCalled();
      expect(state().turns.get("old")?.closed?.data).toEqual({
        turn: "old",
        outcome: "interrupted",
        calls: phase === "reserved" ? 0 : 1,
        applied: [],
        reason: "interrupted",
      });
      const later = bus.emit(emission());
      await schedule.flush();
      expect(model).toHaveBeenCalledOnce();
      expect(state().turns.get("new1")?.opened.data.wake).toEqual([later.id]);
      schedule.close();
      bus.close();
      journal.close();
      journal = new SqliteJournal(file, words);
      const restored = journal.replay(emptyMindState, (state, e) => (e.layer === "house" ? mindStep(state, e) : state));
      expect(restored.turns.get("old")?.closed?.data.outcome).toBe("interrupted");
      expect(restored.turns.get("new1")?.closed?.data.outcome).toBe("done");
      expect(restored.turns.size).toBe(2);
    } finally {
      journal.close();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
