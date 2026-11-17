// Arma pedidos de Anthropic, lee respuestas validadas y presta el transporte HTTP.
import { modelTexts } from "../../texts/model.texts.ts";
import type { Card, Usage } from "./catalog.ts";
import { providerSchema, matchesSchema } from "./schema.ts";

type Request = {
  card: Card;
  maxOutputTokens: number;
  layers: readonly [string, string, string, string];
  changing: string;
  schema: Record<string, unknown>;
};
export type FailureKind = "http" | "transport" | "refusal" | "max_tokens" | "json" | "schema" | "response";
export class ModelFailure extends Error {
  readonly kind: FailureKind;
  constructor(kind: FailureKind, cause: string) {
    super(`${kind}: ${cause}`, { cause });
    this.name = "ModelFailure";
    this.kind = kind;
  }
}
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new ModelFailure("response", `${modelTexts.missing}: ${name}`);
};
export function requestBody(request: Request) {
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
    output_config: {
      effort: request.card.effort,
      format: { type: "json_schema", schema: providerSchema(request.schema) },
    },
    system: request.layers.map((text, index) =>
      index === 3 ? { type: "text", text, cache_control: { type: "ephemeral" } } : { type: "text", text },
    ),
    messages: [{ role: "user", content: request.changing }],
  };
}
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
    value = JSON.parse(text);
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
export async function callAnthropic(request: Request, key: string, transport: typeof fetch = fetch) {
  if (!key) throw new ModelFailure("transport", modelTexts.key);
  const body = JSON.stringify(requestBody(request));
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
  if (!response.ok) throw new ModelFailure("http", `${modelTexts.http} ${response.status}`);
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ModelFailure("json", modelTexts.json);
  }
  return readResponse(data, request.schema);
}
