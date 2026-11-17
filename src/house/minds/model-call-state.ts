// Reconstruye reservas y gasto exacto; una llamada incierta mantiene su reserva hasta liquidarse.
import { Value } from "@sinclair/typebox/value";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { HouseEvent } from "../facts.ts";
import { modelCallFacts } from "./model-call-facts.ts";
export type ModelCall = Readonly<{
  reserved: HouseEvent<"model-call-reserved">;
  status: "reserved" | "started" | "uncertain" | "settled" | "cancelled";
  settled?: HouseEvent<"model-call-settled">;
}>;
export type ModelAccount = Readonly<{ spentNanoUsd: number; reservedNanoUsd: number }>;
export type ModelCalls = ReadonlyMap<string, ModelCall>;
function isCall(event: HouseEvent): event is HouseEvent<keyof typeof modelCallFacts> {
  return Object.hasOwn(modelCallFacts, event.kind);
}
export function modelCallStep(state: ModelCalls, event: HouseEvent): ModelCalls {
  if (!isCall(event)) return state;
  requireMind(Value.Check(modelCallFacts[event.kind], event.data), event.kind);
  requireMind(parseMindActor(event.by), "call.by");
  const previous = state.get(event.data.call);
  if (event.kind === "model-call-reserved") {
    requireMind(!previous, "call.reserved");
    const calls = [...state.values()].filter(call => call.reserved.data.turn === event.data.turn);
    requireMind(
      calls.every(call => call.status === "settled" || call.status === "cancelled"),
      "call.pending",
    );
    requireMind(event.data.number === calls.filter(call => call.status === "settled").length + 1, "call.number");
    return new Map(state).set(event.data.call, { reserved: event, status: "reserved" });
  }
  requireMind(
    previous && previous.reserved.by === event.by && previous.reserved.process === event.process,
    "call.owner",
  );
  return new Map(state).set(event.data.call, advanceCall(previous, event));
}
function advanceCall(
  previous: ModelCall,
  event: HouseEvent<Exclude<keyof typeof modelCallFacts, "model-call-reserved">>,
): ModelCall {
  if (event.kind === "model-call-started") {
    requireMind(previous.status === "reserved", "call.started");
    return { ...previous, status: "started" };
  }
  if (event.kind === "model-call-cancelled") {
    requireMind(previous.status === "reserved", "call.cancelled");
    return { ...previous, status: "cancelled" };
  }
  requireMind(previous.status === "started" || previous.status === "uncertain", "call.sent");
  if (event.kind === "model-call-uncertain") return { ...previous, status: "uncertain" };
  return { ...previous, status: "settled", settled: event };
}
export function modelAccount(state: ModelCalls, account: string): ModelAccount {
  requireMind(state, "state");
  requireMind(typeof account === "string" && account.length > 0, "account");
  let spentNanoUsd = 0;
  let reservedNanoUsd = 0;
  for (const call of state.values()) {
    if (call.reserved.data.account !== account) continue;
    spentNanoUsd += call.settled?.data.actualNanoUsd ?? 0;
    if (call.status !== "settled" && call.status !== "cancelled") reservedNanoUsd += call.reserved.data.maximumNanoUsd;
  }
  requireMind(Number.isSafeInteger(spentNanoUsd) && Number.isSafeInteger(reservedNanoUsd), "account.overflow");
  return { spentNanoUsd, reservedNanoUsd };
}
