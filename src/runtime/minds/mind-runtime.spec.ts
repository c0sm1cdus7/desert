import "../../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { afterEach, expect, it, vi } from "vitest";
import { cards } from "../../adapters/models/catalog.ts";
import { defineMessage } from "../../fields/messages.ts";
import { effect } from "../../house/facts.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { startHouse } from "../house-runtime.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "../../../tests/support/shop.ts";
import type { ModelHouseOptions, MindSwitches } from "./mind-runtime-options.ts";
const homes: string[] = [];
const opened: { close(): void }[] = [];
afterEach(() => {
  opened.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const skill = defineMessage({
  id: "test.skill",
  kind: "skill",
  parameters: Type.Object({}),
  texts: { es: "Usá las acciones de prueba." },
});
const rules = defineMessage({
  id: "test.mind",
  kind: "mind",
  parameters: Type.Object({}),
  texts: { es: "Trabajá con tu kit." },
});
const fingerprint = { cases: "c", skill: "s", frameTexts: "f" };
const input = Type.Object({ text: Type.String() }, { additionalProperties: false });
const answer = (acts: readonly unknown[] = [{ act: "say", target: "probe", input: { text: "Respondí" } }]) => ({
  scene: "Listo",
  consultation: null,
  acts,
});
function fixture(switches?: MindSwitches) {
  const path = mkdtempSync(join(tmpdir(), "dist-minds-"));
  homes.push(path);
  const base = cards[0];
  if (!base) throw new Error("card");
  const card = {
    ...base,
    results: ["assistant", "program"].map(role => ({
      role,
      passed: true,
      cases: 1,
      scenes: 3,
      costUsd: 0,
      seconds: 1,
      date: "2026-11-18",
      fingerprint,
    })),
  };
  const run = vi.fn(() => ({ status: "accepted" as const, text: "Hecho" }));
  const registry = [
    ...shopRegistry,
    {
      id: "probe",
      purpose: "Prueba",
      skill,
      targets: () => [],
      view: () => "Visible",
      summary: () => "Resumen",
      acts: {
        say: toolAct<Shop, typeof input>(input, run),
        work: { ...toolAct<Shop, typeof input>(input, run), reach: "world" as const },
      },
    },
  ];
  let respond = () => Promise.resolve(answer());
  const transport = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify(await respond()) }],
          usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 4 },
        }),
      ),
  );
  const options: ModelHouseOptions<Shop> = {
    by: "shop",
    projectionVersion: "mind-test/1",
    identities: true,
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: registry.map(tool => tool.id) }] },
    words: shop,
    registry,
    slices: shopSlices,
    ...(switches ? { minds: switches } : {}),
    modelMinds: {
      language: "es",
      catalog: [card],
      providers: ["anthropic"],
      account: "test",
      capNanoUsd: 1000000000,
      maxInputTokens: 50000,
      key: () => Promise.resolve("synthetic"),
      fingerprint: () => fingerprint,
      transport,
      definitions: ["assistant:ana", "mind:probe"].map(actor => ({
        actor: actor === "assistant:ana" ? "assistant:ana" : "mind:probe",
        role: actor === "assistant:ana" ? "assistant" : "program",
        rules,
        communication: [{ tool: "probe", act: "say" }],
      })),
      message: event =>
        event.by === "ana" && event.layer === "house" && event.kind === "act" && event.data.object === "probe"
          ? { text: "Nora, mirá", to: ["assistant:ana"], by: event.by }
          : undefined,
      textRules: [],
      rulesVersion: () => "v1",
    },
  };
  const start = () => {
    const house = startHouse(path, options);
    opened.push(house);
    return house;
  };
  const prepare = (house: ReturnType<typeof start>) => {
    house.bus.emit(effect("assistant-enabled", { owner: "ana", name: "Nora" }, "ana"));
    house.bus.emit(
      effect("assistant-kit-set", { owner: "ana", kit: [{ tool: "probe", acts: ["say", "work"] }] }, "ana"),
    );
    house.bus.emit(effect("kit-set", { holder: "mind:probe", tool: "probe", acts: ["say", "work"] }, "ana"));
    for (const mind of ["assistant:ana", "mind:probe"] as const)
      house.bus.emit(
        effect(
          "mind-card-assigned",
          { mind, card: card.model, version: card.effort, capabilities: [...card.capabilities] },
          "ana",
        ),
      );
    house.tools.act({ act: "attend", input: { target: "probe" } }, 0, "ana");
  };
  const wake = (house: ReturnType<typeof start>) =>
    house.tools.act({ act: "say", target: "probe", input: { text: "Nora" } }, 0, "ana");
  return {
    path,
    options,
    start,
    prepare,
    wake,
    transport,
    run,
    respond: (next: typeof respond) => {
      respond = next;
    },
  };
}
it.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])("matrix: assistants=%s programs=%s, SQLite and restart without repeating calls", async (assistants, programs) => {
  const f = fixture({ assistants: assistants, programs: programs ? ["probe"] : [] });
  const first = f.start();
  f.prepare(first);
  f.wake(first);
  const minds = await first.minds;
  await minds?.flush();
  expect(f.transport).toHaveBeenCalledTimes(Number(assistants) + Number(programs));
  const turns = [...first.tools.state().house.minds.turns.values()];
  expect(turns).toHaveLength(Number(assistants) + Number(programs));
  expect(turns.every(turn => turn.closed?.data.outcome === "done" && turn.closed.data.applied.length === 1)).toBe(true);
  if (programs) {
    const program = f.transport.mock.calls.find(
      call => typeof call[1]?.body === "string" && call[1].body.includes("mind:probe"),
    );
    expect(program?.[1]?.body).toContain("Usá las acciones de prueba");
  }
  first.close();
  const second = f.start();
  const resumed = await second.minds;
  await resumed?.flush();
  expect(f.transport).toHaveBeenCalledTimes(turns.length);
  expect(second.tools.state().house.modelCalls.size).toBe(turns.length);
});
it("recovers the thread's cut and keeps the arrivals after the restart", async () => {
  const f = fixture({ assistants: false, programs: ["probe"] });
  const first = f.start();
  f.prepare(first);
  f.wake(first);
  const mind = await first.minds;
  if (!mind) throw new Error("minds");
  await mind.flush();
  const scope = { kind: "consciousness", actor: "mind:probe" } as const;
  const old = mind.thread(scope).entries;
  expect(old.length).toBeGreaterThan(0);
  mind.compact(scope, { through: first.tools.state().through, keep: [] });
  first.close();
  const second = f.start();
  const resumed = await second.minds;
  if (!resumed) throw new Error("minds");
  await resumed.flush();
  expect(resumed.thread(scope).entries).toEqual([]);
  expect(resumed.thread(scope).compacted[0]?.omitted).toEqual(old.map(entry => entry.id));
  f.wake(second);
  await resumed.flush();
  expect(resumed.thread(scope).entries.length).toBeGreaterThan(0);
  expect(resumed.thread(scope).entries.every(entry => !old.some(previous => previous.id === entry.id))).toBe(true);
});
it.each(["assistant:ana", "mind:probe"] as const)(
  "closes an open call of %s and discards its late answer",
  async actor => {
    const f = fixture({ assistants: actor === "assistant:ana", programs: actor === "mind:probe" ? ["probe"] : [] });
    let finish: (value: ReturnType<typeof answer>) => void = () => {};
    f.respond(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    const first = f.start();
    f.prepare(first);
    const minds = await first.minds;
    f.wake(first);
    await vi.waitFor(() => expect(f.transport).toHaveBeenCalledOnce());
    first.close();
    const second = f.start();
    const resumed = await second.minds;
    await resumed?.flush();
    const turn = [...second.tools.state().house.minds.turns.values()][0];
    expect(turn?.closed?.data).toMatchObject({ outcome: "interrupted", calls: 1, applied: [] });
    finish(answer());
    await minds?.flush();
    expect(f.transport).toHaveBeenCalledOnce();
    expect(f.run).toHaveBeenCalledOnce();
    expect([...second.tools.state().house.modelCalls.values()][0]?.status).toBe("started");
  },
);
it("a rollback does not wake, and an arrival during the answer keeps another turn", async () => {
  const f = fixture({ assistants: false, programs: ["probe"] });
  const house = f.start();
  f.prepare(house);
  const minds = await house.minds;
  expect(() =>
    house.bus.together(() => {
      f.wake(house);
      throw new Error("rollback");
    }),
  ).toThrow("rollback");
  await minds?.flush();
  expect(f.transport).not.toHaveBeenCalled();
  let finish: (value: ReturnType<typeof answer>) => void = () => {};
  f.respond(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  f.wake(house);
  await vi.waitFor(() => expect(f.transport).toHaveBeenCalledOnce());
  f.wake(house);
  f.respond(() => Promise.resolve(answer()));
  finish(answer());
  await minds?.flush();
  expect(f.transport).toHaveBeenCalledTimes(2);
});
it("abre un journey, trabaja por el motor y termina con su kit", async () => {
  const f = fixture({ assistants: false, programs: ["probe"] });
  const house = f.start();
  f.prepare(house);
  let calls = 0;
  f.respond(() => {
    calls++;
    if (calls === 1)
      return Promise.resolve(
        answer([
          {
            act: "open",
            target: "mind:probe",
            input: { goal: "Hacer la prueba", kit: [{ tool: "probe", acts: ["work"] }] },
          },
        ]),
      );
    const journey = [...house.tools.state().house.journeys.keys()][0];
    if (calls === 2)
      return Promise.resolve(
        answer([
          { act: "work", target: "probe", input: { text: "Trabajo" } },
          { act: "end", target: journey, input: { summary: "Terminé", references: [] } },
        ]),
      );
    return Promise.resolve(answer([]));
  });
  const minds = await house.minds;
  f.wake(house);
  await minds?.flush();
  expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
  expect(f.transport).toHaveBeenCalledTimes(3);
  expect(f.run).toHaveBeenCalledTimes(2);
});
