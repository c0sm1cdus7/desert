import { expect, it, vi } from "vitest";
import { createTurnCaller, type MindFrame, type ModelPort, type ModelOutcome } from "./mind-ports.ts";
import { answerConsultation, reviewMindProposal } from "./mind-supervision.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewRequest } from "../../tools/minds/mind-review.ts";
const frame: MindFrame = { layers: ["Casa", "Mente", "Skills", "Reglas"], changing: "Pedido" };
const answer: ModelOutcome = { kind: "answer", value: {}, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
const context = (): TurnContext => ({
  id: "t1",
  scope: { kind: "consciousness", actor: "assistant:franco" },
  wake: ["e1"],
  through: 1,
  limits: turnLimits,
  usage: { calls: 0, corrections: 0, consultations: 0 },
});
const request = (turn: TurnContext): ReviewRequest => ({
  id: "p1",
  reason: "rule",
  scope: turn.scope,
  through: 1,
  acts: [],
  turn,
});
it("admits attempt 12 and never sends the 13th, also between mind and supervisor", async () => {
  const turn = context();
  const model = vi.fn<ModelPort>(() => Promise.resolve(answer));
  const caller = createTurnCaller(model, turn, () => true);
  for (let i = 0; i < 12; i++) await caller.call(i % 2 ? "mind:supervisor" : turn.scope.actor, frame, {});
  await expect(caller.call(turn.scope.actor, frame, {})).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(12);
  expect(model.mock.calls.map(args => args[0].number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  expect(turn.usage.calls).toBe(12);
});
it("serializes concurrent requests and a failure holds the waiting ones", async () => {
  const turn = context();
  const model = vi.fn(async (): Promise<ModelOutcome> => {
    await Promise.resolve();
    return { kind: "failed", reason: "transport" };
  });
  const caller = createTurnCaller(model, turn, () => true);
  const results = await Promise.allSettled(Array.from({ length: 3 }, () => caller.call(turn.scope.actor, frame, {})));
  expect(results.map(r => r.status)).toEqual(["fulfilled", "rejected", "rejected"]);
  expect(model).toHaveBeenCalledOnce();
  expect(turn.usage.calls).toBe(1);
});
it("an unknown exception is neither retried nor exposes its content", async () => {
  const turn = context();
  const caller = createTurnCaller(
    async () => {
      await Promise.resolve();

      throw new Error("contenido privado sintético");
    },
    turn,
    () => true,
  );
  expect(await caller.call(turn.scope.actor, frame, {})).toEqual({ kind: "uncertain" });
  await expect(caller.call(turn.scope.actor, frame, {})).rejects.toThrow();
});
it("with no supervisor and no rules it passes, and consultation comes back without a supervisor", async () => {
  const turn = context();
  const caller = createTurnCaller(
    async () => {
      await Promise.resolve();
      return answer;
    },
    turn,
    () => true,
  );
  expect(await reviewMindProposal({}, request(turn), caller, "v1")).toMatchObject({ outcome: "passed" });
  expect(
    await answerConsultation({}, { ...request(turn), reason: "consultation", question: "¿Sigo?" }, caller, "v1"),
  ).toMatchObject({ outcome: "passed", text: "No supervisor" });
  expect(turn.usage.calls).toBe(0);
});
it("the rules reject before invoking the supervisor", async () => {
  const turn = context();
  const supervisor = vi.fn();
  const caller = createTurnCaller(
    async () => {
      await Promise.resolve();
      return answer;
    },
    turn,
    () => true,
  );
  const result = await reviewMindProposal(
    {
      supervisor,
      rules: {
        review: r => ({
          proposal: r.id,
          through: r.through,
          rulesVersion: "v1",
          outcome: "rejected",
          text: "No corresponde",
        }),
      },
    },
    request(turn),
    caller,
    "v1",
  );
  expect(result.outcome).toBe("rejected");
  expect(supervisor).not.toHaveBeenCalled();
});
it("a failed supervisor is not the same as a missing one", async () => {
  const turn = context();
  const caller = createTurnCaller(
    async () => {
      await Promise.resolve();
      return answer;
    },
    turn,
    () => true,
  );
  expect(
    await reviewMindProposal(
      {
        supervisor: async () => {
          await Promise.resolve();

          throw new Error("falló");
        },
      },
      request(turn),
      caller,
      "v1",
    ),
  ).toMatchObject({ outcome: "failed" });
});
it("rejects approvals of another proposal, sequence or version", async () => {
  for (const change of [{ proposal: "other" }, { through: 2 }, { rulesVersion: "old" }]) {
    const turn = context();
    const caller = createTurnCaller(
      async () => {
        await Promise.resolve();
        return answer;
      },
      turn,
      () => true,
    );
    expect(
      await reviewMindProposal(
        {
          supervisor: async r => {
            await Promise.resolve();
            return {
              proposal: r.id,
              through: r.through,
              rulesVersion: "v1",
              outcome: "passed",
              text: "Admitido",
              ...change,
            };
          },
        },
        request(turn),
        caller,
        "v1",
      ),
    ).toMatchObject({ outcome: "failed" });
  }
});
it("shares the correction with the supervisor's invalid answers and accepts no pending invalid one", async () => {
  const turn = context();
  const responses: ModelOutcome[] = [{ kind: "invalid", reason: "json" }, answer];
  const caller = createTurnCaller(
    () => Promise.resolve(responses.shift() ?? answer),
    turn,
    () => true,
  );
  await caller.call("mind:supervisor", frame, {});
  expect(caller.correct()).toBe(false);
  expect(turn.usage.corrections).toBe(1);
  const ports = {
    supervisor: () =>
      Promise.resolve({ proposal: "p1", through: 1, rulesVersion: "v1", outcome: "passed" as const, text: "Admitido" }),
  };
  expect(await reviewMindProposal(ports, request(turn), caller, "v1")).toMatchObject({ outcome: "failed" });
  await caller.call("mind:supervisor", frame, {});
  expect(await reviewMindProposal(ports, request(turn), caller, "v1")).toMatchObject({ outcome: "passed" });
});
it("prevents a second supervisor correction even if it alters the public counter", async () => {
  const turn = context();
  const model = vi.fn(() => Promise.resolve<ModelOutcome>({ kind: "invalid", reason: "schema" }));
  const caller = createTurnCaller(model, turn, () => true);
  await caller.call("mind:supervisor", frame, {});
  turn.usage.corrections = 0;
  await caller.call("mind:supervisor", frame, {});
  await expect(caller.call("mind:supervisor", frame, {})).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(2);
});
