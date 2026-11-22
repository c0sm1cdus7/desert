import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { answerSchema, validateAnswer, type MindMenu } from "../../tools/minds/mind-answer.ts";
import { matchesSchema, providerSchema } from "./schema.ts";
import { callAnthropic, readResponse } from "./anthropic.ts";
import { object } from "../../fields/visible-text.ts";
import { journeyInputs } from "../../tools/minds/journey-menu.ts";
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
  consulta: null,
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
  // A target is a string in the grammar: the house refuses a thread outside its menu, with the fault «menu».
  const outside = answer("threads/say", "communicator/threads/9", { text: "Hola" });
  expect(matchesSchema(sent, outside)).toBe(true);
  const scope = { kind: "journey", actor: "mind:communicator", process: "j", kit: [] } as const;
  const context = { menu, scope, active: true, consulted: false, allowed: () => true };
  expect(validateAnswer(outside, context)).toEqual({ ok: false, faults: [{ code: "menu", path: "/acts/0" }] });
  expect(matchesSchema(sent, answer("threads/say", "communicator/threads/1", { text: "x", replyTo: "otro" }))).toBe(
    false,
  );
  const crossed = answer("threads/add", "mind:communicator", { identity: "franco" });
  expect(matchesSchema(sent, crossed)).toBe(true);
  expect(validateAnswer(crossed, context)).toEqual({ ok: false, faults: [{ code: "menu", path: "/acts/0" }] });
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
/** The journey menu whose grammar the provider refused on 21-22/11: three device tools with start, status and
 * cancel on one device, a thread to report in among fourteen, and the journey's five controls. */
function agentsJourney(threads: number, process: string): MindMenu {
  const text = Type.String({ minLength: 1, maxLength: 4000 });
  const job = object({ job: Type.String({ pattern: "^[a-f0-9-]{36}$" }) });
  const device = [{ kind: "device" as const, device: "linux" }];
  const start = (tool: string) =>
    object({
      folder: text,
      assignment: text,
      ...(tool === "shell" ? { command: Type.Array(text), timeoutSeconds: Type.Integer() } : {}),
      ...(tool === "codex" ? { model: Type.Optional(text) } : {}),
    });
  return [
    ...(["plan", "done", "wait", "end", "desist"] as const).map(act => ({
      tool: "journey",
      act,
      target: process,
      input: journeyInputs[act],
      scope: "control" as const,
    })),
    ...ids(threads, "communicator/threads").map(target => ({
      tool: "communicator",
      act: "threads/say",
      target,
      input: object({ text }),
      scope: "work" as const,
    })),
    ...["shell", "claude", "codex"].flatMap(tool =>
      (["start", "status", "cancel"] as const).map(act => ({
        tool: "agents",
        act: `${tool}/${act}`,
        target: `agents/${tool}`,
        input: act === "start" ? start(tool) : job,
        scope: "work" as const,
        destinations: device,
      })),
    ),
  ];
}
it("asks with one branch per kind of act, never spelling a journey, a tool's target or a device", () => {
  const process = "journey:298bfaae-9dfb-4eb6-900a-9207d04d2e09";
  const sent = providerSchema(answerSchema(agentsJourney(14, process)));
  expect(providerSchema(answerSchema(agentsJourney(15, process)))).toEqual(sent);
  const grammar = JSON.stringify(sent, (key, value: unknown) => (key === "description" ? undefined : value));
  for (const spelled of [process, "agents/shell", "linux", "destination", "communicator/threads/1"])
    expect(grammar).not.toContain(spelled);
  const acts = (isObject(sent.properties) && isObject(sent.properties.acts) && sent.properties.acts.items) || {};
  expect(isObject(acts) && Array.isArray(acts.anyOf) ? acts.anyOf.length : 0).toBeLessThanOrEqual(10);
  expect(grammar.length).toBeLessThan(4064);
});
it("puts back what the grammar left out, so the house reads the whole act", () => {
  const process = "journey:298bfaae-9dfb-4eb6-900a-9207d04d2e09";
  const schema = answerSchema(agentsJourney(14, process));
  const job = "c496a516-4530-480e-b970-f59c46320423";
  const body = (acts: unknown[]) => ({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ scene: "Sigo", consulta: null, acts }) }],
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  });
  const read = readResponse(
    body([
      { act: "claude/status", input: { job } },
      { act: "end", input: { summary: "Listo", references: [] } },
    ]),
    schema,
  );
  expect(read.value).toMatchObject({
    acts: [
      {
        act: "claude/status",
        target: "agents/claude",
        input: { job },
        destination: { kind: "device", device: "linux" },
      },
      { act: "end", target: process },
    ],
  });
  const said = { act: "threads/say", target: "communicator/threads/3", input: { text: "Hola" } };
  expect(readResponse(body([said]), schema).value).toMatchObject({ acts: [said] });
  expect(() => readResponse(body([{ act: "threads/say", input: { text: "Hola" } }]), schema)).toThrow("schema");
});
it("keeps each act's own target and destination when two tools name an act alike", () => {
  const text = object({ text: Type.String() });
  const menu: MindMenu = [
    { tool: "notas", act: "create", target: "notas/lista", input: text, scope: "work" },
    { tool: "agenda", act: "create", target: "agenda/dias", input: object({ when: Type.String() }), scope: "work" },
    { tool: "correo", act: "send", target: "correo/salida", input: text, scope: "work" },
    {
      tool: "fax",
      act: "send",
      target: "fax/salida",
      input: text,
      scope: "work",
      destinations: [{ kind: "house" }],
    },
  ];
  const schema = answerSchema(menu);
  const body = (acts: unknown[]) => ({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ scene: "Listo", consulta: null, acts }) }],
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  });
  const acts = [
    { act: "create", target: "notas/lista", input: { text: "Mate" } },
    { act: "create", target: "agenda/dias", input: { when: "jueves" } },
    { act: "send", target: "correo/salida", input: { text: "Hola" } },
    { act: "send", target: "fax/salida", input: { text: "Hola" }, destination: { kind: "house" } },
  ];
  const read = readResponse(body(acts), schema).value;
  expect(read).toMatchObject({ acts });
  const scope = { kind: "journey", actor: "mind:notas", process: "j", kit: [] } as const;
  const context = { menu, scope, active: true, consulted: false, allowed: () => true };
  const faults = validateAnswer(read, context);
  // The kit is empty here, so each act is out of scope; no act is outside the menu or wrongly destined.
  expect(faults.ok ? [] : faults.faults.filter(fault => fault.code !== "scope")).toEqual([]);
});
