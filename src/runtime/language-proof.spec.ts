// The proof of 23/11: one house, an identity that reads it in Spanish and one in English; minds always in English.
import "../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { afterEach, expect, it, vi } from "vitest";
import { cards } from "../adapters/models/catalog.ts";
import { defineMessage } from "../fields/messages.ts";
import { effect } from "../house/facts.ts";
import { houseRouter } from "../surface/bridge/assembly/house-router.ts";
import { frameHouse } from "../texts/mind-frame.texts.ts";
import { toolAct } from "../tools/act-definition.ts";
import { shop, shopRegistry, shopShown, shopSlices, type Shop } from "../../tests/support/shop.ts";
import { localPorts, startHouse } from "./house-runtime.ts";
import type { ModelHouseOptions } from "./minds/mind-runtime-options.ts";
const homes: string[] = [];
const opened: { close(): void }[] = [];
afterEach(() => {
  opened.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const tools = ["sales", "payments"];
/** Ana reads the house in Spanish, Beto in English, and Carla, who sells, in Spanish: whoever creates them says so. */
const creation = {
  admin: "ana",
  language: "es" as const,
  assignments: [
    { identity: "ana", tools, language: "es" as const },
    { identity: "beto", tools, language: "en" as const },
    { identity: "carla", tools, language: "es" as const },
  ],
};
const home = (): string => {
  const path = mkdtempSync(join(tmpdir(), "desert-languages-"));
  homes.push(path);
  return path;
};
/** A screen with its words taken out: what is left is its shape, the same for every reader. */
const shape = (value: unknown): unknown => {
  if (typeof value === "string") return "·";
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, each]) => [key, shape(each)]));
};
/** Every word a screen says to its reader: titles, details, what is empty and what a key does; no ids. */
const shownKeys = new Set(["title", "detail", "empty", "does"]);
const words = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(words);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, each]) => {
    if (typeof each !== "string") return words(each);
    return shownKeys.has(key) ? [each] : [];
  });
};
/** Whether a screen says these words, alone or at the start of what it says. */
const says = (screen: unknown, word: string): boolean =>
  words(screen).some(each => each === word || each.startsWith(`${word} `));
it("each identity sees the same screen in its own language", () => {
  const house = startHouse(home(), {
    by: "shop",
    projectionVersion: "shop/1",
    words: shop,
    registry: shopRegistry,
    slices: shopSlices,
    creation,
  });
  opened.push(house);
  house.tools.act({ act: "attend", input: { target: "sales" } }, house.tools.state().through, "carla");
  const sale = { act: "register", target: "sales", input: { sale: "s1", total: 1500 } };
  expect(house.tools.act(sale, house.tools.state().through, "carla")).toMatchObject({ status: "accepted" });
  const seen = (identity: string, keys: readonly string[]) => {
    const router = houseRouter(localPorts(house, identity, { recentLines: 20 }), shopShown);
    for (const text of keys) router.send({ kind: "type", text });
    const screen = router.screen({ rows: 30 });
    router.stop();
    return screen;
  };
  /** The Menu, then the tool of sales, each read by both: the same rows, each in its reader's words. */
  const screens = [
    {
      keys: [],
      es: ["Menú", "Atención", "Registrada · s1", "ventas", "1 venta"],
      en: ["Menu", "Attention", "Registered · s1", "sales", "1 sale"],
    },
    { keys: ["v", "\r"], es: ["Ventas", "Registradas"], en: ["Sales", "Registered"] },
  ];
  for (const { keys, es, en } of screens) {
    const spanish = seen("ana", keys);
    const english = seen("beto", keys);
    expect(shape(english)).toEqual(shape(spanish));
    expect([spanish.language, english.language]).toEqual(["es", "en"]);
    for (const word of es) expect(says(spanish, word), word).toBe(true);
    for (const word of en) expect(says(english, word), word).toBe(true);
    for (const word of es.filter(each => !en.includes(each))) expect(says(english, word), word).toBe(false);
    for (const word of en.filter(each => !es.includes(each))) expect(says(spanish, word), word).toBe(false);
  }
});
const skill = defineMessage({
  id: "proof.skill",
  kind: "skill",
  parameters: Type.Object({}),
  texts: { en: "Answer whoever writes with probe's say.", es: "Contestale a quien escribe con say de probe." },
});
const rules = defineMessage({
  id: "proof.mind",
  kind: "mind",
  parameters: Type.Object({}),
  texts: { en: "Work with your kit.", es: "Trabajá con tu kit." },
});
const fingerprint = { cases: "c", skill: "s", frameTexts: "f" };
const input = Type.Object({ text: Type.String(), to: Type.String() }, { additionalProperties: false });
/** A house whose program mind is woken by what Ana writes to it, and answers with a model the test plays. */
function mindHouse() {
  const base = cards[0];
  if (!base) throw new Error("card");
  const results = [{ role: "program", passed: true, cases: 1, scenes: 3, costUsd: 0, seconds: 1, date: "2026-11-18" }];
  const card = { ...base, results: results.map(result => ({ ...result, fingerprint })) };
  const answer = { scene: "Done", consultation: null, acts: [] };
  const usage = { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 4 };
  const content = [{ type: "text", text: JSON.stringify(answer) }];
  const transport = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify({ stop_reason: "end_turn", content, usage }))),
  );
  const run = () => ({ status: "accepted" as const, text: { en: "Said · probe", es: "Dicho · probe" } });
  const probe = { id: "probe", purpose: { en: "Proof", es: "Prueba" }, skill, targets: () => [], view: () => "{}" };
  const registry = [
    ...shopRegistry,
    {
      ...probe,
      summary: () => ({ en: "Proof", es: "Prueba" }),
      acts: { say: toolAct<Shop, typeof input>(input, run) },
    },
  ];
  const options: ModelHouseOptions<Shop> = {
    by: "shop",
    projectionVersion: "proof/1",
    identities: true,
    creation: { ...creation, assignments: creation.assignments.map(each => ({ ...each, tools: ["probe"] })) },
    words: shop,
    registry,
    slices: shopSlices,
    minds: { assistants: false, programs: ["probe"] },
    modelMinds: {
      catalog: [card],
      providers: ["anthropic"],
      account: "test",
      capNanoUsd: 1000000000,
      maxInputTokens: 50000,
      key: () => Promise.resolve("synthetic"),
      fingerprint: () => fingerprint,
      transport,
      definitions: [{ actor: "mind:probe", role: "program", rules, communication: [{ tool: "probe", act: "say" }] }],
      message: event =>
        event.layer === "house" && event.kind === "act" && event.data.object === "probe"
          ? { text: "Hola, ¿me ayudás?", to: ["mind:probe"], by: event.by }
          : undefined,
      textRules: [],
      rulesVersion: () => "v1",
    },
  };
  const house = startHouse(home(), options);
  opened.push(house);
  house.bus.emit(effect("kit-set", { holder: "mind:probe", tool: "probe", acts: ["say"] }, "ana"));
  const assigned = { mind: "mind:probe", card: card.model, version: card.effort, capabilities: [...card.capabilities] };
  house.bus.emit(effect("mind-card-assigned", assigned, "ana"));
  return { house, transport };
}
/** Every text of a request to the model, as the model reads it. */
const requestText = (body: unknown): string => {
  if (typeof body === "string") return body;
  if (Array.isArray(body)) return body.map(requestText).join("\n");
  if (body === null || typeof body !== "object") return "";
  return Object.values(body).map(requestText).join("\n");
};
it("frames a mind in English, shows it each identity's language and asks it to write to each in it", async () => {
  const { house, transport } = mindHouse();
  house.tools.act({ act: "attend", input: { target: "probe" } }, house.tools.state().through, "ana");
  const write = { act: "say", target: "probe", input: { text: "Hola, ¿me ayudás?", to: "mind:probe" } };
  expect(house.tools.act(write, house.tools.state().through, "ana")).toMatchObject({ status: "accepted" });
  const minds = await house.minds;
  await minds?.flush();
  expect(transport).toHaveBeenCalledOnce();
  const sent = transport.mock.calls[0]?.[1]?.body;
  if (typeof sent !== "string") throw new Error("the request has no body");
  const body: unknown = JSON.parse(sent);
  const read = requestText(body);
  expect(read).toContain(frameHouse.text("en", {}));
  expect(read).not.toContain(frameHouse.text("es", {}));
  /** Context names each identity's language; the message that woke it says the language to answer it in. */
  const languages = [
    ["ana", "es"],
    ["beto", "en"],
    ["carla", "es"],
  ] as const;
  const context = { identities: languages.map(([identity, language]) => ({ identity, name: identity, language })) };
  expect(read).toContain(JSON.stringify(context));
  expect(read).toContain("Write to each identity in that identity's language. Do all work in English");
  expect(read).toContain("ana wrote: Hola, ¿me ayudás? (write to ana in es)");
  expect(read).not.toMatch(/Sos una mente|Herramientas:|Contexto:|Actividad:/u);
});
