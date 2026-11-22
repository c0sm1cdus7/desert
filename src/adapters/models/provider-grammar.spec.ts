import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { answerSchema, type MindMenu } from "../../tools/minds/mind-answer.ts";
import { matchesSchema, providerSchema } from "./schema.ts";
import { callAnthropic } from "./anthropic.ts";
import { cards } from "./catalog.ts";
import { enumLimit } from "./schema-compaction.ts";
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
/** The documented explicit limits of the provider grammar (structured outputs, 20/11). */
const providerLimits = { optional: 24, unions: 16 } as const;
function providerComplexity(schema: unknown) {
  let optional = 0;
  let unions = 0;
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isObject(node)) return;
    if (Array.isArray(node.anyOf) || Array.isArray(node.type)) unions++;
    if (node.type === "object" && isObject(node.properties)) {
      const required = new Set(Array.isArray(node.required) ? node.required : []);
      optional += Object.keys(node.properties).filter(key => !required.has(key)).length;
    }
    Object.values(node).forEach(visit);
  };
  visit(schema);
  return { optional, unions, bytes: JSON.stringify(schema).length };
}
const ids = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
/** The shape that broke the communicator: one branch per thread and one literal per message to reply to. */
function houseMenu(threads: number, messages: number): MindMenu {
  const replyTo = Type.Union(ids(messages, "message").map(id => Type.Literal(id)));
  const to = Type.Union(["franco", "martin", "mind:notes"].map(id => Type.Literal(id)));
  return [
    ...ids(threads, "communicator/threads").flatMap(target => [
      {
        tool: "communicator",
        act: "threads/say",
        target,
        scope: "work" as const,
        input: Type.Object({ text: Type.String(), replyTo: Type.Optional(replyTo) }),
      },
      {
        tool: "communicator",
        act: "threads/add",
        target,
        scope: "work" as const,
        input: Type.Object({ identity: to }),
      },
    ]),
    {
      tool: "communicator",
      act: "message",
      target: "mind:communicator",
      scope: "communication" as const,
      input: Type.Object({ to, text: Type.String(), replyTo: Type.Optional(replyTo) }),
    },
    { tool: "journeys", act: "end", target: "journey", scope: "control" as const, input: Type.Object({}) },
  ];
}
const answer = (act: string, target: string, input: unknown) => ({
  scene: "Listo",
  consultation: null,
  acts: [{ act, target, input }],
});
it("keeps the grammar the same size and inside the documented limits however much the house grows", () => {
  const small = providerSchema(answerSchema(houseMenu(enumLimit + 1, enumLimit + 1)));
  const large = providerSchema(answerSchema(houseMenu(300, 1000)));
  expect(large).toEqual(small);
  const measured = providerComplexity(large);
  expect(measured.optional).toBeLessThanOrEqual(providerLimits.optional);
  expect(measured.unions).toBeLessThanOrEqual(providerLimits.unions);
  expect(measured.bytes).toBeLessThan(4000);
});
it("merges branches exactly while the lists are short, and the local contract keeps every dropped constraint", () => {
  const menu = houseMenu(3, 4);
  const local = answerSchema(menu);
  const sent = providerSchema(local);
  expect(JSON.stringify(sent).match(/threads\/say/g)).toHaveLength(1);
  for (const target of ids(3, "communicator/threads")) {
    const said = answer("threads/say", target, { text: "Hola", replyTo: "message-2" });
    expect(matchesSchema(sent, said)).toBe(true);
    expect(matchesSchema(local, said)).toBe(true);
  }
  expect(matchesSchema(sent, answer("threads/say", "communicator/threads/9", { text: "Hola" }))).toBe(false);
  expect(matchesSchema(sent, answer("threads/say", "communicator/threads/1", { text: "x", replyTo: "other" }))).toBe(
    false,
  );
  const crossed = answer("threads/add", "mind:communicator", { identity: "franco" });
  expect(matchesSchema(sent, crossed)).toBe(false);
  const huge = houseMenu(200, 200);
  const unknownReply = answer("threads/say", "communicator/threads/7", { text: "Hola", replyTo: "message-999" });
  expect(matchesSchema(providerSchema(answerSchema(huge)), unknownReply)).toBe(true);
  expect(matchesSchema(answerSchema(huge), unknownReply)).toBe(false);
});
it("resends a grammar the provider refuses without constraint, remembers it and reads fenced JSON", async () => {
  const card = cards[0];
  if (!card) throw new Error("card");
  const schema = {
    type: "object",
    properties: { scene: { type: "string" } },
    required: ["scene"],
    description: "grammar",
  };
  const request = { card, maxOutputTokens: 10, layers: ["a", "b", "c", "d"] as const, changing: "x", schema };
  const sent: Record<string, unknown>[] = [];
  const refusal = {
    type: "error",
    error: { type: "invalid_request_error", message: "The compiled grammar is too large" },
  };
  const answer = {
    stop_reason: "end_turn",
    content: [{ type: "text", text: '```json\n{"scene":"ok"}\n```' }],
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  };
  const transport: typeof fetch = (_url, init) => {
    const body: unknown = JSON.parse(typeof init?.body === "string" ? init.body : "");
    if (!isObject(body)) throw new Error("body");
    sent.push(body);
    const constrained = isObject(body.output_config) && "format" in body.output_config;
    return Promise.resolve(
      new Response(JSON.stringify(constrained ? refusal : answer), { status: constrained ? 400 : 200 }),
    );
  };
  expect((await callAnthropic(request, "k", transport)).value).toEqual({ scene: "ok" });
  expect((await callAnthropic(request, "k", transport)).value).toEqual({ scene: "ok" });
  expect(sent.map(body => isObject(body.output_config) && "format" in body.output_config)).toEqual([
    true,
    false,
    false,
  ]);
  expect(JSON.stringify(sent[1])).toContain("Respondé solo con un objeto JSON");
});
