import { expect, it, vi } from "vitest";
import { createMindActReview } from "./mind-act-review.ts";
import { createTurnCaller, type ModelPort, type TurnPorts } from "./mind-ports.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewRequest, ReviewReason } from "../../tools/minds/mind-review.ts";
import type { HouseEmission } from "../../house/facts.ts";
const turn: TurnContext = {
  id: "t1",
  scope: { kind: "consciousness", actor: "assistant:franco" },
  through: 1,
  wake: ["cause"],
  limits: turnLimits,
  usage: { calls: 0, corrections: 0, consultations: 0 },
};
function fixture() {
  let open = true;
  const events: HouseEmission[] = [];
  const model: ModelPort = () => Promise.resolve({ kind: "failed", reason: "transport" });
  const ports: TurnPorts = {
    frame: () => ({ layers: ["Casa", "Mente", "Skills", "Reglas"], changing: "Pedido" }),
    model,
    isOpen: () => open,
    read: () => ({ active: true, menu: [], through: 1, rulesVersion: "v1", now: 0 }),
    allowed: () => true,
    supervision: {},
    emit: e => {
      events.push(e);
    },
    execute: () => Promise.resolve({ status: "accepted", id: "a1" }),
  };
  const caller = createTurnCaller(model, turn, () => open);
  const request = (reason: ReviewReason): ReviewRequest => ({
    id: "p1",
    reason,
    scope: turn.scope,
    through: 1,
    acts: [{ act: "send", target: "mail", input: {} }],
    turn,
  });
  return {
    ports,
    caller,
    request,
    events,
    close: () => {
      open = false;
    },
  };
}
it.each(["rule", "consultation"] as const)("reviews %s and leaves the record with a fixed author", async reason => {
  const f = fixture();
  const request = f.request(reason);
  const asked = reason === "consultation" ? { ...request, question: "¿Sigo?" } : request;
  const result = await createMindActReview(f.ports, turn, f.caller).review(asked);
  expect(result.outcome).toBe("passed");
  expect(f.events).toHaveLength(1);
  expect(f.events[0]).toMatchObject({
    kind: "mind-review-recorded",
    by: turn.scope.actor,
    data: { reason, result: "passed", rulesVersion: "v1" },
  });
});
it("the execution adapter can ask the same port for the verdict before a nested marked act", async () => {
  const f = fixture();
  const outside = vi.fn();
  f.ports.supervision.rules = {
    review: r => ({
      proposal: r.id,
      through: r.through,
      rulesVersion: "v1",
      outcome: "rejected",
      text: "No corresponde",
    }),
  };
  const review = createMindActReview(f.ports, turn, f.caller);
  const nested = async () => {
    const result = await review.review(f.request("rule"));
    if (result.outcome === "passed") outside();
    return result;
  };
  expect((await nested()).outcome).toBe("rejected");
  expect(outside).not.toHaveBeenCalled();
});
it("accepts no other actor or process in the review", async () => {
  const f = fixture();
  const review = createMindActReview(f.ports, turn, f.caller);
  await expect(
    review.review({ ...f.request("rule"), scope: { kind: "consciousness", actor: "assistant:martin" } }),
  ).rejects.toThrow("review.scope");
  await expect(
    review.review({
      ...f.request("rule"),
      scope: { kind: "journey", actor: turn.scope.actor, process: "other", kit: [] },
    }),
  ).rejects.toThrow("review.scope");
});
it("writes no late review after closing", async () => {
  const f = fixture();
  f.ports.supervision.supervisor = r => {
    f.close();
    return Promise.resolve({
      proposal: r.id,
      through: r.through,
      rulesVersion: "v1",
      outcome: "passed",
      text: "Admitido",
    });
  };
  await expect(createMindActReview(f.ports, turn, f.caller).review(f.request("rule"))).rejects.toThrow();
  expect(f.events).toEqual([]);
});
