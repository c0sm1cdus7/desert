// Examples of each new fact, to test schemas and whole-effect boundaries.
import { effect } from "../../src/house/facts.ts";
const bankEffect = (by: string) =>
  effect(
    "mind-bank-tested",
    {
      mind: "mind:sales",
      card: "test",
      version: "low",
      result: {
        role: "sales",
        cases: 1,
        scenes: 3,
        passed: true,
        costUsd: 0,
        seconds: 0,
        date: "2026-11-18",
        fingerprint: { cases: "cases-v1", skill: "skill-v1", frameTexts: "texts-v1" },
      },
    },
    by,
  );
export const mindEffects = (by: string, publisher = by) => [
  effect("assistant-enabled", { owner: "beto", name: "Nora" }, by),
  effect("assistant-disabled", { owner: "beto" }, by),
  effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "sales", acts: ["forge"] }] }, by),
  effect("assistant-adopted", { owner: "beto", legacy: "nora" }, by),
  effect("mind-card-assigned", { mind: "assistant:beto", card: "test", version: "v1", capabilities: [] }, by),
  bankEffect(by),
  effect("mind-cards-published", { mind: "assistant:beto", cards: [] }, publisher),
  effect("journey-opened", { goal: "Guardar una nota", kit: [] }, by, [], "j1"),
  effect("journey-plan-written", { steps: [{ id: "s1", text: "Anotar" }] }, by, [], "j1"),
  effect("journey-step-done", { step: "s1", note: "Anotada" }, by, [], "j1"),
  effect("journey-waiting", { what: "Una respuesta", until: 1000 }, by, [], "j1"),
  effect("journey-interrupted", { reason: "Pará: falta el permiso" }, "mind:supervisor", [], "j1"),
  effect("journey-resumed", { note: "Mirá la respuesta" }, by, [], "j1"),
  effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, by, [], "j1"),
  effect("mind-turn-opened", { turn: "t1", wake: [] }, by),
  effect("mind-answer-invalid", { turn: "t1", faults: [{ code: "shape", path: "/scene" }] }, by),
  effect("mind-consultation-requested", { turn: "t1", question: "¿Sigo?", acts: [] }, by),
  effect("mind-consultation-answered", { turn: "t1", answer: "Sin supervisor", source: "unconfigured" }, by),
  effect(
    "mind-review-recorded",
    { turn: "t1", proposal: "p1", acts: [], rulesVersion: "v1", reason: "open", result: "passed", text: "Admitido" },
    by,
  ),
  effect("mind-scene", { turn: "t1", text: "Preparando" }, by),
  effect("mind-message", { turn: "t1", to: "mind:sales", text: "Pedido" }, by),
  effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 1, applied: [] }, by),
  effect("model-call-reserved", { call: "c1", turn: "t1", account: "test", number: 1, maximumNanoUsd: 100 }, by),
  effect("model-call-started", { call: "c1" }, by),
  effect(
    "model-call-settled",
    { call: "c1", actualNanoUsd: 70, usage: { input: 1, cacheWrite: 2, cacheRead: 3, output: 4 } },
    by,
  ),
  effect("model-call-uncertain", { call: "c1" }, by),
  effect("model-call-cancelled", { call: "c1" }, by),
];
