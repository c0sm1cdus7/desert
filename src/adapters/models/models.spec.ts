import { describe, expect, it } from "vitest";
import { cardsFor, lostActs, withinCap } from "../../../tests/support/retired-helpers/catalog.ts";
import { callAnthropic, requestBody } from "./anthropic.ts";
import { cards, costUsd } from "./catalog.ts";

const first = cards[0];
if (!first) throw new Error("missing card");
describe("cards and Anthropic", () => {
  it("filters by every capability and lists lost acts", () => {
    expect(cards).toHaveLength(15);
    const acts = [{ needs: ["sees"] as const }, { needs: ["hears"] as const }];
    expect(cardsFor(acts)).toEqual([]);
    expect(lostActs(first, acts)).toEqual([acts[1]]);
  });
  it("computes prices and the worst case of the cap with cache writes", () => {
    const card = cards.find(c => c.model === "claude-sonnet-5-5");
    if (!card) throw new Error("missing card");
    expect(costUsd(card, { input: 1_000_000, cacheRead: 1_000_000, cacheWrite: 0, output: 1_000_000 })).toBe(12.1);
    // Worst case: 100 tokens written to cache (2.5) and 100 of output (10) = 0.00125.
    expect(withinCap({ spentUsd: 0, capUsd: 0.00125, card, maxInputTokens: 100, maxOutputTokens: 100 })).toBe(true);
    expect(withinCap({ spentUsd: 0, capUsd: 0.00124, card, maxInputTokens: 100, maxOutputTokens: 100 })).toBe(false);
  });
  it("builds the exact body and validates the whole response", async () => {
    const args = {
      card: first,
      maxOutputTokens: 16000,
      layers: ["house", "mind", "skills", "rules"] as const,
      changing: "now",
      schema: {
        type: "object",
        properties: { text: { type: "string", minLength: 2 } },
        required: ["text"],
        additionalProperties: false,
      },
    };
    const expected = {
      model: args.card.model,
      max_tokens: 16000,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { text: { type: "string", description: "At least 2 characters." } },
            required: ["text"],
            additionalProperties: false,
          },
        },
      },
      system: [
        { type: "text", text: "house" },
        { type: "text", text: "mind" },
        { type: "text", text: "skills" },
        { type: "text", text: "rules", cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: "now" }],
    };
    expect(requestBody(args)).toEqual(expected);
    const transport: typeof fetch = (_url, init) => {
      if (typeof init?.body !== "string") throw new Error("missing body");
      expect(JSON.parse(init.body)).toEqual(expected);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            stop_reason: "end_turn",
            content: [{ type: "text", text: '{"text":"x"}' }],
            usage: { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1 },
          }),
          { status: 200 },
        ),
      );
    };
    await expect(callAnthropic(args, "synthetic", transport)).rejects.toThrow();
  });
});
