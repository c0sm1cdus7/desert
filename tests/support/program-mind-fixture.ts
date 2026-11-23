// Composes two programs with a hand-assigned starting card and a synthetic provider; runs the bank offline.
import "./fixture-vault.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import { compose, type DistributionOf } from "../../src/runtime/distributions/compose.ts";
import { defineProgram } from "../../src/tools/installable/program.ts";
import type { ProgramMindScene } from "../../src/tools/minds/program-mind-cases.ts";
import { sampleBody, sampleMetadata, sampleOptions } from "./installable-program.ts";
import { startHouse, type RunningHouse } from "../../src/runtime/house-runtime.ts";
import { effect } from "../../src/house/facts.ts";
import type { MindAnswer } from "../../src/tools/minds/mind-answer.ts";
import type { ProgramMindResources } from "../../src/runtime/minds/program-mind-options.ts";
import { messageText } from "./frame-text.ts";
const bankScene: ProgramMindScene = {
  given: [],
  kit: [],
  when: { act: "personal/add", target: "notes/personal", input: {} },
  check: events =>
    events.some(
      event => event.layer === "house" && event.kind === "mind-scene" && event.data.text === "Banco aprobado",
    ),
};
function notesFor(scene: ProgramMindScene) {
  return defineProgram(sampleMetadata, {
    ...sampleBody,
    mindCases: [{ id: "recognizes-note", scenes: [scene, scene, scene] }] as const,
  });
}
const other = defineProgram(
  { ...sampleMetadata, id: "agenda", facts: [] },
  { ...sampleBody, tools: {}, words: { ...sampleBody.words, name: "Agenda", key: "g" } },
);
const requestSchema = Type.Object({
  model: Type.String(),
  output_config: Type.Object({ effort: Type.String() }),
  messages: Type.Array(Type.Object({ content: Type.Unknown() })),
});
type FakeRequest = { model: string; effort: string; changing: string; body: string };
function syntheticModel() {
  const frames: FakeRequest[] = [];
  let respond: (request: FakeRequest) => MindAnswer = () => ({ scene: "Banco aprobado", acts: [], consultation: null });
  const transport = vi.fn<typeof fetch>((_url, init) => {
    if (typeof init?.body !== "string") throw new Error("request.body");
    const body: unknown = JSON.parse(init.body);
    if (!Value.Check(requestSchema, body)) throw new Error("request.shape");
    const request = {
      model: body.model,
      effort: body.output_config.effort,
      changing: messageText(body.messages[0]?.content),
      body: init.body,
    };
    frames.push(request);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify(respond(request)) }],
          usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        }),
      ),
    );
  });
  return {
    frames,
    transport,
    respond: (next: typeof respond) => {
      respond = next;
    },
  };
}
type FixtureHouse = RunningHouse<DistributionOf<readonly [ReturnType<typeof notesFor>, typeof other]>>;
class ProgramMindFixture {
  readonly home = mkdtempSync(join(tmpdir(), "composed-minds-"));
  readonly distribution;
  constructor(scene: ProgramMindScene) {
    this.distribution = compose({
      ...sampleOptions,
      programs: [notesFor(scene), other],
      minds: { assistants: false, programs: ["notes"] },
    });
  }
  private readonly model = syntheticModel();
  readonly frames = this.model.frames;
  readonly transport = this.model.transport;
  readonly respond = this.model.respond;
  private readonly houses: { close(): void }[] = [];
  readonly resources: ProgramMindResources = {
    key: () => Promise.resolve("synthetic"),
    transport: this.transport,
    account: "test",
    capNanoUsd: 1000000000,
    cards: { "mind:notes": { model: "claude-haiku-5-5", effort: "low" } },
  };
  async open(
    changes: Partial<ProgramMindResources> = {},
    enabled = true,
    projectionVersion = this.distribution.program.projectionVersion,
  ) {
    const modelMinds = await this.options(changes);
    const house = startHouse(this.home, {
      ...this.distribution.program,
      projectionVersion,
      modelMinds,
      by: "distribution",
      ...(!enabled ? { minds: { assistants: false, programs: [] } } : {}),
      creation: {
        admin: "ana",
        language: "es",
        assignments: [{ identity: "ana", tools: ["notes", "agenda"], language: "es" }],
      },
    });
    this.houses.push(house);
    await (await house.minds)?.flush();
    return house;
  }
  options(changes: Partial<ProgramMindResources> = {}) {
    return this.distribution.modelMinds({ ...this.resources, ...changes });
  }
  /** Composes the catalog offline against an open house, as a person would before choosing cards. */
  async bank(house: FixtureHouse, changes: Partial<ProgramMindResources> = {}) {
    return house.bankMinds(await this.options(changes), { assistants: false, programs: ["notes"] });
  }
  wake(house: FixtureHouse) {
    house.bus.emit(effect("attended", { target: "notes/personal" }, "ana"));
    return house.tools.act({ act: "personal/add", target: "notes/personal", input: {} }, 0, "ana");
  }
  cleanup() {
    this.houses.forEach(house => house.close());
    rmSync(this.home, { recursive: true, force: true });
  }
}
export function programMindFixture(scene: ProgramMindScene = bankScene) {
  return new ProgramMindFixture(scene);
}
