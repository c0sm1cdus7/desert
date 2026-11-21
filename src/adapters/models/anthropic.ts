// Builds Anthropic requests, reads validated answers and lends the HTTP transport.
import { createHash } from "node:crypto";
import { modelTexts } from "../../texts/model.texts.ts";
import type { Card, Usage } from "./catalog.ts";
import { providerSchema, matchesSchema } from "./schema.ts";
import type { ProviderRejection } from "../../fields/provider-rejection.ts";
import { readProviderError } from "./provider-error.ts";

/** One exchange after the first message: the schema its answer was asked with, that answer, and what was told back. */
type Exchange = Readonly<{ asked: Record<string, unknown>; answer?: string; told: string }>;
type Request = {
  card: Card;
  maxOutputTokens: number;
  layers: readonly [string, string, string, string];
  changing: string;
  schema: Record<string, unknown>;
  exchanges?: readonly Exchange[];
};
export type FailureKind = "http" | "transport" | "refusal" | "max_tokens" | "json" | "schema" | "response";
export class ModelFailure extends Error {
  readonly kind: FailureKind;
  readonly rejection?: ProviderRejection;
  constructor(kind: FailureKind, cause: string, rejection?: ProviderRejection) {
    super(`${kind}: ${cause}`, { cause });
    this.name = "ModelFailure";
    this.kind = kind;
    if (rejection) this.rejection = rejection;
  }
}
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new ModelFailure("response", `${modelTexts.missing}: ${name}`);
};
/** The provider refuses some valid schemas for the size of their compiled grammar; those go unconstrained. */
const grammarRefused = /compiled grammar is too large|schema is too complex/iu;
const unconstrained = new Set<string>();
const schemaKey = (schema: Record<string, unknown>) =>
  createHash("sha256")
    .update(JSON.stringify(providerSchema(schema)))
    .digest("hex");
type Message = Readonly<{ role: "user" | "assistant"; content: string }>;
const unconstrainedAsk = (schema: Record<string, unknown>): Message => ({
  role: "user",
  content: `${modelTexts.jsonOnly}\n${JSON.stringify(providerSchema(schema))}`,
});
/** Every call repeats what the earlier calls sent, byte for byte, and appends: the provider reads that prefix from
 * its cache. An unconstrained schema travels as its own message after the one that asks, and stays in the history. */
function conversation(request: Request, constrained: boolean): Message[] {
  const asks = (schema: Record<string, unknown>) =>
    unconstrained.has(schemaKey(schema)) ? [unconstrainedAsk(schema)] : [];
  const exchanges = request.exchanges ?? [];
  if (exchanges.some(each => typeof each.told !== "string" || !each.asked))
    throw new ModelFailure("response", modelTexts.request);
  return [
    { role: "user", content: request.changing },
    ...exchanges.flatMap((each): Message[] => [
      ...asks(each.asked),
      ...(each.answer === undefined ? [] : [{ role: "assistant" as const, content: each.answer }]),
      { role: "user", content: each.told },
    ]),
    ...(constrained ? [] : [unconstrainedAsk(request.schema)]),
  ];
}
export function requestBody(request: Request, constrained = !unconstrained.has(schemaKey(request.schema))) {
  required(request, "request");
  required(request.card, "card");
  required(request.maxOutputTokens, "maxOutputTokens");
  required(request.layers, "layers");
  required(request.changing, "changing");
  required(request.schema, "schema");
  if (
    !Number.isSafeInteger(request.maxOutputTokens) ||
    request.maxOutputTokens <= 0 ||
    request.layers.some(x => typeof x !== "string") ||
    typeof request.changing !== "string"
  )
    throw new ModelFailure("response", modelTexts.request);
  return {
    model: request.card.model,
    max_tokens: request.maxOutputTokens,
    output_config: constrained
      ? { effort: request.card.effort, format: { type: "json_schema", schema: providerSchema(request.schema) } }
      : { effort: request.card.effort },
    system: request.layers.map((text, index) =>
      index === 3 ? { type: "text", text, cache_control: { type: "ephemeral" } } : { type: "text", text },
    ),
    // A turn's conversation is cached up to its end, so the next call of the same turn reads it from the cache.
    ...(request.exchanges ? { cache_control: { type: "ephemeral" } } : {}),
    messages: conversation(request, constrained),
  };
}
/** Unconstrained answers may come fenced; the local contract still checks the whole value. */
const unfenced = (text: string) => /^\s*```(?:json)?\s*\n([\s\S]*?)\n```\s*$/u.exec(text)?.[1] ?? text;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isList = (value: unknown): value is unknown[] => Array.isArray(value);
const tokenCount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new ModelFailure("response", modelTexts.response);
  return value;
};
export function readResponse(data: unknown, schema: Record<string, unknown>): { value: unknown; usage: Usage } {
  if (!isRecord(data)) throw new ModelFailure("response", modelTexts.response);
  const response = data;
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens")
    throw new ModelFailure(
      response.stop_reason,
      response.stop_reason === "refusal" ? modelTexts.refusal : modelTexts.maxTokens,
    );
  const blocks = response.content;
  const block = isList(blocks) ? blocks.find(item => isRecord(item) && item.type === "text") : undefined;
  const text = isRecord(block) ? block.text : undefined;
  if (typeof text !== "string") throw new ModelFailure("response", modelTexts.response);
  let value: unknown;
  try {
    value = JSON.parse(unfenced(text));
  } catch {
    throw new ModelFailure("json", modelTexts.json);
  }
  let valid: boolean;
  try {
    valid = matchesSchema(schema, value);
  } catch {
    throw new ModelFailure("schema", modelTexts.schema);
  }
  if (!valid) throw new ModelFailure("schema", modelTexts.schema);
  const raw = response.usage;
  if (!isRecord(raw)) throw new ModelFailure("response", modelTexts.response);
  return {
    value,
    usage: {
      input: tokenCount(raw.input_tokens),
      cacheWrite: tokenCount(raw.cache_creation_input_tokens),
      cacheRead: tokenCount(raw.cache_read_input_tokens),
      output: tokenCount(raw.output_tokens),
    },
  };
}
export async function callAnthropic(
  request: Request,
  key: string,
  transport: typeof fetch = fetch,
  scrub: (text: string) => string = text => text,
) {
  if (!key) throw new ModelFailure("transport", modelTexts.key);
  const constrained = !unconstrained.has(schemaKey(request.schema));
  try {
    return await sendAnthropic(request, key, transport, scrub, constrained);
  } catch (error) {
    const rejection = error instanceof ModelFailure ? error.rejection : undefined;
    if (!constrained || rejection?.status !== 400 || !grammarRefused.test(rejection.message)) throw error;
    unconstrained.add(schemaKey(request.schema));
    return sendAnthropic(request, key, transport, scrub, false);
  }
}
async function sendAnthropic(
  request: Request,
  key: string,
  transport: typeof fetch,
  scrub: (text: string) => string,
  constrained: boolean,
) {
  const body = JSON.stringify(requestBody(request, constrained));
  let response: Response;
  try {
    response = await transport("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2026-10-21" },
      body,
    });
  } catch {
    throw new ModelFailure("transport", modelTexts.transport);
  }
  if (!response.ok) {
    const rejection = await readProviderError(response, key, scrub);
    throw new ModelFailure("http", `${rejection.status} ${rejection.type}: ${rejection.message}`, rejection);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ModelFailure("json", modelTexts.json);
  }
  return readResponse(data, request.schema);
}
