// Runs a text-field program, a talk program and an assistant with hand-assigned cards and a durable journal.
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
import { talkAct, talkKit, talkProgram } from "./talk-program.ts";
export const answer = (acts: MindAnswer["acts"] = [], scene = "Ready"): MindAnswer => ({ scene, acts, consulta: null });
const requestShape = Type.Object({ messages: Type.Array(Type.Object({ content: Type.String() })) });
function withAssistant(options: MindRuntimeOptions): MindRuntimeOptions {
  return {
    ...options,
    definitions: [
      ...options.definitions,
      {
        actor: "assistant:ana",
        role: "assistant",
        rules: { ...programMindRules, text: () => "Nora" },
        communication: [{ tool: "talk", act: talkAct.act }],
      },
    ],
  };
}
function assignAssistant(house: RequestHouse, card: Pick<Card, "model" | "effort" | "capabilities">) {
  house.bus.emit(effect("assistant-enabled", { owner: "ana", name: "Nora" }, "ana"));
  const kit = explicitKit([talkKit], kitLayout(house.registry));
  house.bus.emit(effect("assistant-kit-set", { version: 2, owner: "ana", kit }, "ana"));
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
      programas: [requestProgram(scenes), talkProgram],
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
  private options() {
    return this.distribution.modelMinds({
      language: "es",
      key: () => Promise.resolve("synthetic"),
      transport: this.transport,
      account: "test",
      capNanoUsd: 1_000_000_000,
      cards: { "mind:notes": { model: "claude-haiku-5-5", effort: "low" } },
    });
  }
  async open(enabled = true) {
    const options = await this.options();
    const house = startHouse(this.home, {
      ...this.distribution.program,
      by: "distribution",
      creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notes", "talk"] }] },
      modelMinds: withAssistant(options),
      ...(!enabled ? { mentes: { asistentes: false, programas: [] } } : {}),
    });
    this.houses.push(house);
    if (enabled && !house.tools.state().house.mindAssignments.has("assistant:ana")) {
      const card = options.catalog[0];
      if (!card) throw new Error("card");
      assignAssistant(house, card);
    }
    await (await house.minds)?.flush();
    return house;
  }
  /** Composes the catalog offline for the notes mind, as a person would before choosing its card. */
  async bank(house: RequestHouse) {
    return house.bankMinds(await this.options(), { asistentes: false, programas: ["notes"] });
  }
  prepare(house: RequestHouse) {
    house.bus.emit(
      effect(
        "kit-set",
        { version: 2, holder: "mind:notes", kit: explicitKit([...requestKit, talkKit], kitLayout(house.registry)) },
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
/** Says a line through the talk program as ana, who first opens the thread like a person would. */
export function send(house: RequestHouse, to: string, text: string) {
  house.bus.emit(effect("attended", { target: talkAct.target }, "ana"));
  return house.tools.act(say(to, text), house.tools.state().through, "ana");
}
/** The talk act a mind answers with to say a line to one reader. */
export const say = (to: string, text: string) => ({ ...talkAct, input: { to, text } });
export const openWork = (body: string) => ({
  act: "open",
  target: "mind:notes",
  input: { goal: body, kit: requestKit },
});
export const finishWork = (id: string, body: string, extra = {}) => [
  { act: "personal/add", target: "notes/personal", input: { body, ...extra } },
  { act: "end", target: id, input: { summary: body, references: [] } },
];
