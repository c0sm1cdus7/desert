// A turn's later calls repeat what the earlier calls sent, byte for byte, and append; the provider caches the prefix.
import { expect, it } from "vitest";
import { callAnthropic, requestBody } from "./anthropic.ts";
import { cards } from "./catalog.ts";
const card = cards[0];
const request = (schema: Record<string, unknown>) => {
  if (!card) throw new Error("card");
  return { card, maxOutputTokens: 10, layers: ["a", "b", "c", "d"] as const, changing: "Marco", schema };
};
const schema = { type: "object", properties: { scene: { type: "string" } }, required: ["scene"] };
it("a one-off call sends its frame alone; a turn's conversation appends and asks the provider to cache it", () => {
  expect(requestBody(request(schema))).not.toHaveProperty("cache_control");
  const first = requestBody({ ...request(schema), exchanges: [] });
  const second = requestBody({
    ...request(schema),
    exchanges: [{ asked: schema, answer: '{"scene":"x"}', told: "R" }],
  });
  expect(first).toMatchObject({ cache_control: { type: "ephemeral" }, messages: [{ role: "user", content: "Marco" }] });
  expect(second.messages.slice(0, first.messages.length)).toEqual(first.messages);
  expect(second.messages.slice(first.messages.length)).toEqual([
    { role: "assistant", content: '{"scene":"x"}' },
    { role: "user", content: "R" },
  ]);
  const unread = requestBody({ ...request(schema), exchanges: [{ asked: schema, told: "Corregí" }] });
  expect(unread.messages.slice(1)).toEqual([{ role: "user", content: "Corregí" }]);
});
it("an unconstrained schema stays in the history where it was asked, so the prefix still matches", async () => {
  const refused = { ...schema, description: "too big" };
  const sent: { messages: unknown[] }[] = [];
  const transport: typeof fetch = (_url, init) => {
    const body: unknown = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
    if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages))
      throw new Error("body");
    const constrained = "output_config" in body && JSON.stringify(body.output_config).includes("json_schema");
    if (!constrained) sent.push({ messages: body.messages });
    const answer = {
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"scene":"ok"}' }],
      usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    };
    const refusal = { type: "error", error: { type: "invalid_request_error", message: "schema is too complex" } };
    return Promise.resolve(
      new Response(JSON.stringify(constrained ? refusal : answer), { status: constrained ? 400 : 200 }),
    );
  };
  await callAnthropic({ ...request(refused), exchanges: [] }, "k", transport);
  await callAnthropic(
    { ...request(refused), exchanges: [{ asked: refused, answer: '{"scene":"ok"}', told: "R" }] },
    "k",
    transport,
  );
  const [first, second] = sent;
  expect(first?.messages).toHaveLength(2);
  expect(JSON.stringify(first?.messages[1])).toContain("too big");
  expect(second?.messages.slice(0, 2)).toEqual(first?.messages);
  expect(second?.messages).toHaveLength(5);
});
