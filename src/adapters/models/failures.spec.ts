import { describe, expect, it } from "vitest";
import { withinCap } from "../../../tests/support/retired-helpers/catalog.ts";
import { callAnthropic, ModelFailure, readResponse, requestBody } from "./anthropic.ts";
import { cards, costUsd, validBankResult } from "./catalog.ts";

const card = cards[0];
if (!card) throw new Error("missing card");
const schema = {
  type: "object",
  properties: { n: { type: "number", minimum: 1, maximum: 3 } },
  required: ["n"],
  additionalProperties: false,
};
const request = { card, maxOutputTokens: 10, layers: ["a", "b", "c", "d"] as const, changing: "x", schema };
const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1 };
const data = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text }], usage });

describe("card and transport edges", () => {
  it("uses Haiku's high price above 100 thousand and the low one at the edge", () => {
    expect(costUsd(card, { input: 100000, cacheWrite: 0, cacheRead: 0, output: 100000 })).toBeCloseTo(0.06);
    expect(costUsd(card, { input: 100001, cacheWrite: 0, cacheRead: 0, output: 100000 })).toBeCloseTo(0.3000005);
  });
  it("uses the most expensive possible input price and requires a cap", () => {
    const known = {
      model: card.model,
      effort: card.effort,
      capabilities: card.capabilities,
      results: card.results,
      prices: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
    };
    expect(withinCap({ spentUsd: 1, capUsd: 1.0006, card: known, maxInputTokens: 100, maxOutputTokens: 100 })).toBe(
      true,
    );
    expect(withinCap({ spentUsd: 1, capUsd: 1.00059, card: known, maxInputTokens: 100, maxOutputTokens: 100 })).toBe(
      false,
    );
    expect(() => {
      Reflect.apply(withinCap, undefined, [{ spentUsd: 0, card: known, maxInputTokens: 1, maxOutputTokens: 1 }]);
    }).toThrow();
    const unknownWrite = { ...known, prices: { ...known.prices, cacheWrite: null } };
    expect(() => costUsd(unknownWrite, { input: 0, cacheWrite: 1, cacheRead: 0, output: 0 })).toThrow();
    expect(costUsd(unknownWrite, { input: 1, cacheWrite: 0, cacheRead: 0, output: 0 })).toBeCloseTo(0.000001);
    expect(() => {
      Reflect.apply(costUsd, undefined, [card]);
    }).toThrow("usage");
    expect(() => {
      Reflect.apply(withinCap, undefined, []);
    }).toThrow("args");
  });
  it("validates bank results by role", () => {
    const result = {
      role: "assistant",
      cases: 2,
      scenes: 6,
      passed: true,
      costUsd: 1,
      seconds: 2,
      date: "2026-11-17",
      fingerprint: { cases: "a", skill: "b", frameTexts: "c" },
    };
    expect(validBankResult(result)).toBe(true);
    expect(validBankResult({ ...result, scenes: 5 })).toBe(false);
  });
  it.each([
    [data('{"n":2}', "refusal"), "refusal"],
    [data('{"n":2}', "max_tokens"), "max_tokens"],
    [data("{"), "json"],
    [data('{"n":0}'), "schema"],
    [data('{"n":4}'), "schema"],
    [data('{"n":2,"extra":1}'), "schema"],
    [{ ...data('{"n":2}'), usage: {} }, "response"],
  ])("reports the %s failure", (response, kind) => {
    expect(() => readResponse(response, schema)).toThrow(expect.objectContaining({ kind }));
  });
  it("receives exact usage and uses the first text block", () => {
    expect(
      readResponse(
        {
          ...data('{"n":2}'),
          content: [{ type: "other" }, { type: "text", text: '{"n":2}' }, { type: "text", text: "invalid" }],
        },
        schema,
      ),
    ).toEqual({ value: { n: 2 }, usage: { input: 1, cacheWrite: 0, cacheRead: 0, output: 1 } });
  });
  it("sends headers and body to the fake transport without leaking the key in errors", async () => {
    const secret = "synthetic-key";
    const transport: typeof fetch = (_url, init) => {
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-api-key": secret,
        "anthropic-version": "2026-10-21",
      });
      return Promise.resolve(new Response("provider details", { status: 401 }));
    };
    await expect(callAnthropic(request, secret, transport)).rejects.toMatchObject({
      kind: "http",
      message: "http: 401 untyped: provider details",
      rejection: { status: 401, type: "untyped", message: "provider details" },
    });
    await expect(callAnthropic(request, secret, () => Promise.reject(new Error(secret)))).rejects.toMatchObject({
      kind: "transport",
      message: "transport: The provider's transport failed",
    });
    expect(new ModelFailure("http", "401").message).not.toContain(secret);
  });
});

describe("nested schemas", () => {
  it("validates recursive references and keeps properties named like constraints", () => {
    const recursive = {
      $defs: {
        node: {
          type: "object",
          properties: {
            minimum: { type: "string", minLength: 2 },
            children: { type: "array", items: { $ref: "#/$defs/node" }, minItems: 1 },
          },
          required: ["minimum", "children"],
          additionalProperties: false,
        },
      },
      $ref: "#/$defs/node",
    };
    expect(() => readResponse(data('{"minimum":"ok","children":[{"minimum":"x","children":[]}]}'), recursive)).toThrow(
      expect.objectContaining({ kind: "schema" }),
    );
    const sent = requestBody({ ...request, schema: recursive });
    expect(sent.output_config.format?.schema).toMatchObject({
      type: "object",
      properties: { minimum: { type: "string" }, children: { type: "array", items: {} } },
      additionalProperties: false,
    });
  });
});
