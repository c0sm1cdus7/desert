// Connects an assigned card to its provider and keeps the cost of each attempt.
import { callAnthropic, ModelFailure, requestBody } from "../../adapters/models/anthropic.ts";
import { costUsd, type Card, type Usage } from "../../adapters/models/catalog.ts";
import { mindRequest } from "./mind-request.ts";
import { modelFailureLog, turnNotice } from "../../texts/mind-turn.texts.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
import type { ModelOutcome, ModelRequest } from "./mind-ports.ts";
/** Tokens que el proveedor agrega solo (el formato del esquema): los bytes acotan nada más el texto que mandamos. */
export const providerMarginTokens = 4096;
const zeroUsage: Usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
type Ports = Readonly<{
  card: (mind: MindActor) => Readonly<{ card: Card; role: string }> | undefined;
  key: (card: Card) => Promise<string | undefined>;
  capNanoUsd: number;
  maxInputTokens: number;
  reserve: (request: ModelRequest, maximumNanoUsd: number, capNanoUsd: number) => Promise<boolean>;
  start: (request: ModelRequest) => Promise<void>;
  settle: (request: ModelRequest, usage: Usage, actualNanoUsd: number) => Promise<void>;
  uncertain: (request: ModelRequest) => Promise<void>;
  transport: typeof fetch;
  scrub?: (text: string) => string;
}>;
const nano = (usd: number): number => {
  const value = Math.ceil(usd * 1_000_000_000);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("cost");
  return value;
};
function usageOf(data: unknown): Usage | undefined {
  if (!data || typeof data !== "object") return undefined;
  const raw: unknown = Reflect.get(data, "usage");
  if (!raw || typeof raw !== "object") return undefined;
  const values: unknown[] = [
    "input_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "output_tokens",
  ].map(k => {
    const value: unknown = Reflect.get(raw, k);
    return value;
  });
  if (!values.every(x => typeof x === "number" && Number.isSafeInteger(x) && x >= 0)) return undefined;
  const [input, cacheWrite, cacheRead, output] = values;
  if (
    typeof input !== "number" ||
    typeof cacheWrite !== "number" ||
    typeof cacheRead !== "number" ||
    typeof output !== "number"
  )
    return undefined;
  return { input, cacheWrite, cacheRead, output };
}
type Payload = Parameters<typeof requestBody>[0];
function maximumCost(card: Card, maxInputTokens: number): number {
  return Math.max(
    ...(["input", "cacheRead", "cacheWrite"] as const).map(kind =>
      nano(
        costUsd(card, {
          input: kind === "input" ? maxInputTokens : 0,
          cacheRead: kind === "cacheRead" ? maxInputTokens : 0,
          cacheWrite: kind === "cacheWrite" ? maxInputTokens : 0,
          output: 16000,
        }),
      ),
    ),
  );
}
function logFailure(error: ModelFailure, request: ModelRequest) {
  const rejection = error.rejection;
  if (error.kind === "http")
    console.log(
      modelFailureLog.text("es", {
        mind: request.mind,
        turn: request.turn,
        number: request.number,
        cause: turnNotice.text("es", { reason: "http", ...(rejection ? { rejection } : {}) }),
      }),
    );
}
async function failedCall(
  error: unknown,
  usage: Usage | undefined,
  card: Card,
  request: ModelRequest,
  ports: Ports,
): Promise<ModelOutcome> {
  if (!(error instanceof ModelFailure)) {
    await ports.uncertain(request);
    return { kind: "uncertain" };
  }
  logFailure(error, request);
  if (usage) {
    try {
      await ports.settle(request, usage, nano(costUsd(card, usage)));
    } catch {
      await ports.uncertain(request);
      return { kind: "uncertain" };
    }
  } else if (error.kind === "http") {
    // El proveedor contestó con un error: es una respuesta definitiva que no se cobra; la reserva se liquida en cero.
    try {
      await ports.settle(request, zeroUsage, 0);
    } catch {
      await ports.uncertain(request);
      return { kind: "uncertain" };
    }
  } else {
    await ports.uncertain(request);
    return { kind: "uncertain" };
  }
  if (error.kind === "json" || error.kind === "schema" || error.kind === "refusal" || error.kind === "max_tokens")
    return { kind: "invalid", reason: error.kind, ...(usage ? { usage } : {}) };
  if (error.kind === "http")
    return { kind: "failed", reason: "http", ...(error.rejection ? { rejection: error.rejection } : {}) };
  return { kind: "uncertain" };
}
async function send(payload: Payload, key: string, request: ModelRequest, ports: Ports): Promise<ModelOutcome> {
  let usage: Usage | undefined;
  const transport: typeof fetch = async (url, init) => {
    const response = await ports.transport(url, init);
    if (!response.ok) return response;
    try {
      usage = usageOf(await response.clone().json());
    } catch {
      /* La reserva se conserva. */
    }
    return response;
  };
  try {
    const result = await callAnthropic(payload, key, transport, ports.scrub);
    await ports.settle(request, result.usage, nano(costUsd(payload.card, result.usage)));
    return { kind: "answer", ...result };
  } catch (error) {
    return failedCall(error, usage, payload.card, request, ports);
  }
}
async function invoke(request: ModelRequest, ports: Ports): Promise<ModelOutcome> {
  required(request, "request");
  if (!Number.isSafeInteger(request.number) || request.number < 1 || request.number > 12) throw new Error("number");
  const assignment = ports.card(request.mind);
  if (!assignment) return { kind: "not-sent", reason: "no-card" };
  const { card } = assignment;
  let key: string | undefined;
  try {
    key = await ports.key(card);
  } catch {
    return { kind: "not-sent", reason: "no-key" };
  }
  if (!key) return { kind: "not-sent", reason: "no-key" };
  const payload = mindRequest(card, request.frame, request.schema, request.exchanges);
  const body = requestBody(payload);
  // The frame was fitted alone; what a turn appended after it is what can outgrow the request.
  if (new TextEncoder().encode(JSON.stringify(body)).length + providerMarginTokens > ports.maxInputTokens)
    return { kind: "not-sent", reason: request.exchanges?.length ? "conversation-too-large" : "cap" };
  let maximum: number;
  try {
    maximum = maximumCost(card, ports.maxInputTokens);
  } catch {
    return { kind: "not-sent", reason: "cap" };
  }
  if (!(await ports.reserve(request, maximum, ports.capNanoUsd))) return { kind: "not-sent", reason: "cap" };
  await ports.start(request);
  return send(payload, key, request, ports);
}
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new Error(name);
};
export function callAssignedModel(ports: Ports): (request: ModelRequest) => Promise<ModelOutcome> {
  required(ports, "ports");
  if (!Number.isSafeInteger(ports.capNanoUsd) || ports.capNanoUsd < 0) throw new Error("capNanoUsd");
  if (!Number.isSafeInteger(ports.maxInputTokens) || ports.maxInputTokens <= 0) throw new Error("maxInputTokens");
  required(ports.transport, "transport");
  return request => invoke(request, ports);
}
/** La misma carga de referencia ordena todas las cartas; el nombre y versión guardan modelo y esfuerzo. */
export function modelCandidates(cards: readonly Card[]) {
  required(cards, "cards");
  return cards.flatMap(card => {
    try {
      return [
        {
          name: card.model,
          version: card.effort,
          provider: "anthropic",
          capabilities: card.capabilities,
          referenceNanoUsd: nano(costUsd(card, { input: 1_000_000, cacheWrite: 0, cacheRead: 0, output: 1_000_000 })),
          results: card.results,
        },
      ];
    } catch {
      return [];
    }
  });
}
