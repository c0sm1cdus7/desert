// Conecta una carta asignada con el proveedor y conserva el costo de cada intento.
import { callAnthropic, ModelFailure, requestBody } from "../../adapters/models/anthropic.ts";
import { costUsd, validBankResult, type Card, type Usage } from "../../adapters/models/catalog.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
type Frame = Readonly<{ layers: readonly [string, string, string, string]; changing: string }>;
export type ModelRequest = Readonly<{
  mind: MindActor;
  turn: string;
  number: number;
  frame: Frame;
  schema: Record<string, unknown>;
}>;
export type ModelOutcome =
  | Readonly<{ kind: "answer"; value: unknown; usage: Usage }>
  | Readonly<{ kind: "invalid"; reason: "json" | "schema" | "max_tokens" | "refusal"; usage?: Usage }>
  | Readonly<{ kind: "failed"; reason: "http" | "transport" }>
  | Readonly<{ kind: "not-sent"; reason: "cap" | "no-key" | "no-card" }>
  | Readonly<{ kind: "uncertain" }>;
type Ports = Readonly<{
  card: (mind: MindActor) =>
    | Readonly<{
        card: Card;
        role: string;
        fingerprint: Readonly<{ cases: string; skill: string; frameTexts: string }>;
      }>
    | undefined;
  key: (card: Card) => Promise<string | undefined>;
  capNanoUsd: number;
  maxInputTokens: number;
  reserve: (request: ModelRequest, maximumNanoUsd: number, capNanoUsd: number) => Promise<boolean>;
  start: (request: ModelRequest) => Promise<void>;
  settle: (request: ModelRequest, usage: Usage, actualNanoUsd: number) => Promise<void>;
  uncertain: (request: ModelRequest) => Promise<void>;
  transport: typeof fetch;
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
type Assignment = NonNullable<ReturnType<Ports["card"]>>;
type Payload = Parameters<typeof requestBody>[0];
function eligible(assignment: Assignment): boolean {
  const { card, role, fingerprint } = assignment;
  const evidence = [...card.results].reverse().find(result => result.role === role);
  return (
    !!fingerprint.cases &&
    !!fingerprint.skill &&
    !!fingerprint.frameTexts &&
    validBankResult(evidence) &&
    evidence.passed &&
    (["cases", "skill", "frameTexts"] as const).every(key => evidence.fingerprint[key] === fingerprint[key])
  );
}
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
  if (usage) {
    try {
      await ports.settle(request, usage, nano(costUsd(card, usage)));
    } catch {
      await ports.uncertain(request);
      return { kind: "uncertain" };
    }
  } else {
    await ports.uncertain(request);
    if (error.kind !== "http") return { kind: "uncertain" };
  }
  if (error.kind === "json" || error.kind === "schema" || error.kind === "refusal" || error.kind === "max_tokens")
    return { kind: "invalid", reason: error.kind, ...(usage ? { usage } : {}) };
  if (error.kind === "http") return { kind: "failed", reason: "http" };
  return { kind: "uncertain" };
}
async function send(payload: Payload, key: string, request: ModelRequest, ports: Ports): Promise<ModelOutcome> {
  let usage: Usage | undefined;
  const transport: typeof fetch = async (url, init) => {
    const response = await ports.transport(url, init);
    try {
      usage = usageOf(await response.clone().json());
    } catch {
      /* La reserva se conserva. */
    }
    return response;
  };
  try {
    const result = await callAnthropic(payload, key, transport);
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
  if (!assignment || !eligible(assignment)) return { kind: "not-sent", reason: "no-card" };
  const { card } = assignment;
  let key: string | undefined;
  try {
    key = await ports.key(card);
  } catch {
    return { kind: "not-sent", reason: "no-key" };
  }
  if (!key) return { kind: "not-sent", reason: "no-key" };
  const payload = {
    card,
    maxOutputTokens: 16000,
    layers: request.frame.layers,
    changing: request.frame.changing,
    schema: request.schema,
  };
  const body = requestBody(payload);
  if (new TextEncoder().encode(JSON.stringify(body)).length > ports.maxInputTokens)
    return { kind: "not-sent", reason: "cap" };
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
