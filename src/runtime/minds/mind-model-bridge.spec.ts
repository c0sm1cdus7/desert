import { expect, it } from "vitest";
import { cards } from "../../adapters/models/catalog.ts";
import { callAssignedModel, providerMarginTokens } from "./mind-model-bridge.ts";
it("liquida una respuesta inválida con uso y no expone la llave", async () => {
  const card = cards[0];
  if (!card) throw new Error("card");
  const events: unknown[] = [];
  const model = callAssignedModel({
    card: () => ({ card, role: "assistant" }),
    key: () => Promise.resolve("synthetic-key"),
    maxInputTokens: 10000,
    capNanoUsd: 1000000000,
    reserve: (_request, maximum) => {
      events.push(maximum);
      return Promise.resolve(true);
    },
    start: () => Promise.resolve(),
    settle: (_request, usage, amount) => {
      events.push({ usage, amount });
      return Promise.resolve();
    },
    uncertain: () => Promise.resolve(),
    transport: () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            stop_reason: "end_turn",
            content: [{ type: "text", text: "{" }],
            usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 4 },
          }),
        ),
      ),
  });
  const outcome = await model({
    mind: "assistant:franco",
    turn: "turn",
    number: 1,
    frame: { layers: ["a", "b", "c", "d"], changing: "e" },
    schema: { type: "object", additionalProperties: false },
  });
  expect(outcome.kind).toBe("invalid");
  expect(events).toHaveLength(2);
  expect(JSON.stringify(events)).not.toContain("synthetic-key");
});
it("cierra sin enviar sin carta, llave o saldo; una carta asignada a mano se envía sin evidencia", async () => {
  const card = cards[0];
  if (!card) throw new Error("card");
  expect(card.results).toEqual([]);
  let sent = 0;
  let uncertain = 0;
  const ports = {
    card: () => ({ card, role: "assistant" }),
    key: () => Promise.resolve("synthetic"),
    capNanoUsd: 1000000000,
    maxInputTokens: 10000,
    reserve: () => Promise.resolve(true),
    start: () => Promise.resolve(),
    settle: () => Promise.resolve(),
    uncertain: () => {
      uncertain++;
      return Promise.resolve();
    },
    transport: () => {
      sent++;
      return Promise.reject(new Error("synthetic"));
    },
  };
  const request = {
    mind: "assistant:franco" as const,
    turn: "t",
    number: 1,
    frame: { layers: ["a", "b", "c", "d"] as const, changing: "e" },
    schema: { type: "object", additionalProperties: false },
  };
  expect(await callAssignedModel({ ...ports, card: () => undefined })(request)).toEqual({
    kind: "not-sent",
    reason: "no-card",
  });
  expect(await callAssignedModel({ ...ports, key: () => Promise.resolve(undefined) })(request)).toEqual({
    kind: "not-sent",
    reason: "no-key",
  });
  expect(await callAssignedModel({ ...ports, reserve: () => Promise.resolve(false) })(request)).toEqual({
    kind: "not-sent",
    reason: "cap",
  });
  expect(sent).toBe(0);
  expect(await callAssignedModel(ports)(request)).toEqual({ kind: "uncertain" });
  expect(sent).toBe(1);
  expect(uncertain).toBe(1);
});
it("presupuesta escritura de caché, rechaza precios ausentes y liquida una respuesta válida", async () => {
  const card = cards.find(each => each.model === "claude-sonnet-5-5");
  if (!card) throw new Error("card");
  let maximum = 0;
  let actual = 0;
  let sends = 0;
  const ports = {
    card: () => ({ card, role: "assistant" }),
    key: () => Promise.resolve("synthetic"),
    maxInputTokens: 5000,
    capNanoUsd: 1000000000,
    reserve: (_request: unknown, value: number) => {
      maximum = value;
      return Promise.resolve(true);
    },
    start: () => Promise.resolve(),
    settle: (_request: unknown, _usage: unknown, value: number) => {
      actual = value;
      return Promise.resolve();
    },
    uncertain: () => Promise.resolve(),
    transport: () => {
      sends++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            stop_reason: "end_turn",
            content: [{ type: "text", text: "{}" }],
            usage: {
              input_tokens: 10,
              cache_creation_input_tokens: 10,
              cache_read_input_tokens: 10,
              output_tokens: 10,
            },
          }),
        ),
      );
    },
  };
  const request = {
    mind: "assistant:franco" as const,
    turn: "t",
    number: 1,
    frame: { layers: ["a", "b", "c", "d"] as const, changing: "e" },
    schema: { type: "object", additionalProperties: false },
  };
  const unknown = { ...card, prices: { ...card.prices, cacheWrite: null } };
  expect(await callAssignedModel({ ...ports, card: () => ({ card: unknown, role: "assistant" }) })(request)).toEqual({
    kind: "not-sent",
    reason: "cap",
  });
  expect(sends).toBe(0);
  expect((await callAssignedModel(ports)(request)).kind).toBe("answer");
  // Sonnet 5.5: 5000 de entrada escritos en caché a USD 2,50/M más 16000 de salida a USD 10/M.
  expect(maximum).toBe(172500000);
  expect(actual).toBe(146000);
});
const assistantCard = () => {
  const card = cards.find(each => each.model === "claude-sonnet-5-5");
  if (!card) throw new Error("card");
  return { card, role: "assistant" };
};
const smallRequest = {
  mind: "assistant:franco" as const,
  turn: "t",
  number: 1,
  frame: { layers: ["a", "b", "c", "d"] as const, changing: "e" },
  schema: { type: "object", additionalProperties: false },
};
it("un error HTTP del proveedor se liquida en cero y no deja la reserva incierta", async () => {
  const settled: unknown[] = [];
  let uncertain = 0;
  const outcome = await callAssignedModel({
    card: assistantCard,
    key: () => Promise.resolve("synthetic"),
    maxInputTokens: 10000,
    capNanoUsd: 1000000000,
    reserve: () => Promise.resolve(true),
    start: () => Promise.resolve(),
    settle: (_request, usage, amount) => {
      settled.push({ usage, amount });
      return Promise.resolve();
    },
    uncertain: () => {
      uncertain++;
      return Promise.resolve();
    },
    transport: () => Promise.resolve(new Response(JSON.stringify({ type: "error" }), { status: 529 })),
  })(smallRequest);
  expect(outcome).toEqual({
    kind: "failed",
    reason: "http",
    rejection: { status: 529, type: "untyped", message: "El proveedor no informó un mensaje de error." },
  });
  expect(settled).toEqual([{ usage: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }, amount: 0 }]);
  expect(uncertain).toBe(0);
});
it("no envía un pedido cuyos bytes más el margen del proveedor pasan la cota de entrada", async () => {
  let sends = 0;
  const ports = {
    card: assistantCard,
    key: () => Promise.resolve("synthetic"),
    capNanoUsd: 1000000000,
    reserve: () => Promise.resolve(true),
    start: () => Promise.resolve(),
    settle: () => Promise.resolve(),
    uncertain: () => Promise.resolve(),
    transport: () => {
      sends++;
      return Promise.reject(new Error("no debería salir"));
    },
  };
  expect(await callAssignedModel({ ...ports, maxInputTokens: providerMarginTokens })(smallRequest)).toEqual({
    kind: "not-sent",
    reason: "cap",
  });
  expect(sends).toBe(0);
});
