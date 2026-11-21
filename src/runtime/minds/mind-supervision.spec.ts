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
  language: "es",
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
it("admite la tentativa 12 y nunca envía la 13, también entre mente y supervisor", async () => {
  const turn = context();
  const model = vi.fn<ModelPort>(() => Promise.resolve(answer));
  const caller = createTurnCaller(model, turn, () => true);
  for (let i = 0; i < 12; i++) await caller.call(i % 2 ? "mind:supervisor" : turn.scope.actor, frame, {});
  await expect(caller.call(turn.scope.actor, frame, {})).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(12);
  expect(model.mock.calls.map(args => args[0].number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  expect(turn.usage.calls).toBe(12);
});
it("serializa pedidos concurrentes y una falla frena los que esperan", async () => {
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
it("una excepción desconocida no se reintenta ni expone su contenido", async () => {
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
it("sin supervisor ni reglas pasa y consulta vuelve sin supervisor", async () => {
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
  ).toMatchObject({ outcome: "passed", text: "Sin supervisor" });
  expect(turn.usage.calls).toBe(0);
});
it("las reglas rechazan antes de invocar al supervisor", async () => {
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
it("un supervisor fallido no equivale a uno ausente", async () => {
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
it("rechaza aprobaciones de otra propuesta, secuencia o versión", async () => {
  for (const change of [{ proposal: "otra" }, { through: 2 }, { rulesVersion: "vieja" }]) {
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
it("comparte la corrección con respuestas inválidas del supervisor y no acepta una inválida pendiente", async () => {
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
it("impide una segunda corrección del supervisor aunque altere el contador público", async () => {
  const turn = context();
  const model = vi.fn(() => Promise.resolve<ModelOutcome>({ kind: "invalid", reason: "schema" }));
  const caller = createTurnCaller(model, turn, () => true);
  await caller.call("mind:supervisor", frame, {});
  turn.usage.corrections = 0;
  await caller.call("mind:supervisor", frame, {});
  await expect(caller.call("mind:supervisor", frame, {})).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(2);
});
