// Runs a text-field program and an assistant with a synthetic transport and a durable temporary journal.
import "./fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { componer } from "../../src/runtime/distributions/compose.ts";
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { explicitKit, kitLayout } from "../../src/house/kit-selection.ts";
import { effect } from "../../src/house/facts.ts";
import { programMindRules } from "../../src/texts/program-mind.texts.ts";
import type { MindRuntimeOptions } from "../../src/runtime/minds/mind-runtime-options.ts";
import type { Card } from "../../src/adapters/models/catalog.ts";
import type { MindAnswer } from "../../src/tools/minds/mind-answer.ts";
import type { ProgramMindScene } from "../../src/tools/minds/program-mind-cases.ts";
import { sampleOptions } from "./installable-program.ts";
import { requestProgram, requestKit } from "./request-program.ts";
export const answer = (acts: MindAnswer["acts"] = [], scene = "Ready"): MindAnswer => ({ scene, acts, consulta: null });
const requestShape = Type.Object({ messages: Type.Array(Type.Object({ content: Type.String() })) });
const assistantFingerprint = { cases: "synthetic", skill: "synthetic", frameTexts: "synthetic" };
function withAssistant(options: MindRuntimeOptions): MindRuntimeOptions {
  return {
    ...options,
    fingerprint: definition =>
      definition.actor === "assistant:ana" ? assistantFingerprint : options.fingerprint(definition),
    catalog: options.catalog.map(card => ({
      ...card,
      results: [
        ...card.results,
        {
          role: "assistant",
          passed: true,
          cases: 1,
          scenes: 3,
          costUsd: 0,
          seconds: 0,
          date: "2026-11-18",
          fingerprint: assistantFingerprint,
        },
      ],
    })),
    definitions: [
      ...options.definitions,
      {
        actor: "assistant:ana",
        role: "assistant",
        rules: { ...programMindRules, text: () => "Nora" },
        communication: [{ tool: "mind", act: "message" }],
      },
    ],
  };
}
function assignAssistant(house: RequestHouse, card: Pick<Card, "model" | "effort" | "capabilities">) {
  house.bus.emit(effect("assistant-enabled", { owner: "ana", name: "Nora" }, "ana"));
  house.bus.emit(effect("assistant-kit-set", { owner: "ana", kit: [] }, "ana"));
  house.bus.emit(
    effect(
      "mind-card-assigned",
      { mind: "assistant:ana", card: card.model, version: card.effort, capabilities: [...card.capabilities] },
      "ana",
    ),
  );
}
class RequestMindFixture {
  readonly home = mkdtempSync(join(tmpdir(), "mind-requests-"));
  readonly distribution;
  private readonly houses: { close(): void }[] = [];
  private response: (frame: string) => MindAnswer | Promise<MindAnswer> = () => answer();
  constructor(scenes?: readonly [ProgramMindScene, ProgramMindScene, ProgramMindScene]) {
    this.distribution = componer({
      ...sampleOptions,
      programas: [requestProgram(scenes)],
      mentes: { asistentes: true, programas: ["notes"] },
    });
  }
  readonly transport = vi.fn<typeof fetch>(async (_url, init) => {
    if (typeof init?.body !== "string") throw new Error("request.body");
    const body: unknown = JSON.parse(init.body);
    if (!Value.Check(requestShape, body)) throw new Error("request.shape");
    const value = await this.response(body.messages[0]?.content ?? "");
    return new Response(
      JSON.stringify({
        stop_reason: "end_turn",
        content: [{ type: "text", text: JSON.stringify(value) }],
        usage: { input_tokens: 10, output_tokens: 4, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      }),
    );
  });
  async open() {
    const options = await this.distribution.modelMinds({
      language: "es",
      key: () => Promise.resolve("synthetic"),
      transport: this.transport,
      account: "test",
      capNanoUsd: 1_000_000_000,
    });
    const house = startHouse(this.home, {
      ...this.distribution.program,
      by: "distribution",
      creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notes"] }] },
      modelMinds: withAssistant(options),
    });
    this.houses.push(house);
    if (!house.tools.state().house.mindAssignments.has("assistant:ana")) {
      const card = options.catalog[0];
      if (!card) throw new Error("card");
      assignAssistant(house, card);
    }
    await (await house.minds)?.flush();
    return house;
  }
  prepare(house: RequestHouse) {
    house.bus.emit(
      effect(
        "kit-set",
        { version: 2, holder: "mind:notes", kit: explicitKit(requestKit, kitLayout(house.registry)) },
        "ana",
      ),
    );
  }
  respond(next: typeof this.response) {
    this.response = next;
  }
  cleanup() {
    this.houses.forEach(house => house.close());
    rmSync(this.home, { recursive: true, force: true });
  }
}
export function requestMindFixture(scenes?: readonly [ProgramMindScene, ProgramMindScene, ProgramMindScene]) {
  return new RequestMindFixture(scenes);
}
export type RequestHouse = Awaited<ReturnType<ReturnType<typeof requestMindFixture>["open"]>>;
export const history = (house: RequestHouse) =>
  house.journal.replay<import("../../src/journal/vocabulary.ts").Event[]>([], (events, event) => [...events, event]);
export const send = (house: RequestHouse, to: string, text: string) =>
  house.tools.act({ act: "message", target: to, input: { text } }, house.tools.state().through, "ana");
export const openWork = (body: string) => ({
  act: "open",
  target: "mind:notes",
  input: { goal: body, kit: requestKit },
});
export const finishWork = (id: string, body: string, extra = {}) => [
  { act: "personal/add", target: "notes/personal", input: { body, ...extra } },
  { act: "end", target: id, input: { summary: body, references: [] } },
];
