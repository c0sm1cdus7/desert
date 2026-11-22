// A mind turn over in-memory ports: a scripted model, an accepting executor and the mind fold, for turn specs.
import { Type } from "@sinclair/typebox";
import { vi } from "vitest";
import { type HouseEmission, type HouseEvent } from "../../src/house/facts.ts";
import { emptyMindState, mindStep } from "../../src/house/minds/mind-state.ts";
import type { MindFrame, ModelOutcome, TurnPorts, TurnWake } from "../../src/runtime/minds/mind-ports.ts";
export const frame: MindFrame = { layers: ["Casa", "Nora", "Herramientas", "Reglas"], changing: "Pedido" };
export const usage = { input: 1, output: 1, cacheWrite: 0, cacheRead: 0 };
export const act = { act: "say", target: "chat", input: { text: "Listo" } };
export const answer = { scene: "Preparando", consultation: null, acts: [act] };
export const ok = (value: unknown = answer): ModelOutcome => ({ kind: "answer", value, usage });
export const wake: TurnWake = {
  id: "t1",
  scope: { kind: "consciousness", actor: "assistant:franco" },
  language: "es",
  wake: ["e1"],
  through: 1,
};
const menu = [
  {
    tool: "chat",
    act: "say",
    target: "chat",
    input: Type.Object({ text: Type.String() }),
    scope: "communication" as const,
  },
];
/** What a spec may switch while the turn runs: activity, permission and the rules version. */
type Switches = { state: typeof emptyMindState; active: boolean; allowed: boolean; version: string };
function scripted(outcomes: ModelOutcome[]) {
  return vi.fn<TurnPorts["model"]>(async () => {
    await Promise.resolve();
    const value = outcomes.shift();
    if (!value) throw new Error("Sin respuesta falsa");
    return value;
  });
}
export function fixture(outcomes: ModelOutcome[]) {
  const now: Switches = { state: emptyMindState, active: true, allowed: true, version: "v1" };
  const events: HouseEvent[] = [];
  const emit = (emission: HouseEmission) => {
    const event = { ...emission, id: `e${events.length + 2}`, seq: events.length + 2, at: 0 };
    now.state = mindStep(now.state, event);
    events.push(event);
  };
  const model = scripted(outcomes);
  const execute = vi.fn<TurnPorts["execute"]>(async () => {
    await Promise.resolve();
    return { status: "accepted" as const, id: `a${events.length}` };
  });
  const ports: TurnPorts = {
    isOpen: id => !!now.state.turns.get(id) && !now.state.turns.get(id)?.closed,
    frame: () => frame,
    model,
    emit,
    execute,
    read: () => ({ active: now.active, through: events.length + 1, rulesVersion: now.version, menu, now: 0 }),
    allowed: () => now.allowed,
    supervision: {},
  };
  return {
    ports,
    model,
    execute,
    events,
    state: () => now.state,
    deactivate: () => void (now.active = false),
    revoke: () => void (now.allowed = false),
    changeRules: () => void (now.version = "v2"),
    emit,
  };
}
