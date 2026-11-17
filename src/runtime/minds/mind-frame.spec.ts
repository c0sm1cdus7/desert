import { describe, expect, it } from "vitest";
import { requestBody } from "../../adapters/models/anthropic.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { defineMessage } from "../../fields/messages.ts";
import { object } from "../../fields/visible-text.ts";
import { turnLimits } from "../../tools/minds/mind-contract.ts";
import { buildMindFrame } from "./mind-frame.ts";
import { renderMindFrame } from "./mind-frame-text.ts";
import { createFramePort } from "./mind-frame-fit.ts";

const mind = defineMessage({
  id: "test.mind",
  kind: "mind",
  parameters: object({}),
  texts: { es: "Sos Nora. Ayudá a Franco." },
});
const skill = defineMessage({ id: "test.skill", kind: "skill", parameters: object({}), texts: { es: "Usá notas." } });
const scope = { kind: "consciousness", actor: "assistant:franco" } as const;
const turn = {
  id: "t",
  scope,
  language: "es",
  wake: ["e1"],
  through: 4,
  limits: turnLimits,
  usage: { calls: 0, corrections: 0, consultations: 0 },
} as const;
const source = {
  definition: { role: "asistente", actor: scope.actor, rules: mind, communication: [] },
  skills: [{ id: "notas", skill }],
  textRules: [],
  scene: "En casa",
  activity: [],
  objects: [],
  thread: [],
  required: "Pedido actual",
};
describe("mind frame", () => {
  it("renders four stable ordered layers and the changing wake", () => {
    const snapshot = buildMindFrame(scope, turn, source);
    const frame = renderMindFrame(snapshot, "es");
    expect(frame.layers).toHaveLength(4);
    expect(frame.layers[0]).toContain("supervisor");
    expect(frame.layers[1]).toContain("Sos Nora");
    expect(frame.layers[2]).toContain("Usá notas");
    expect(frame.changing).toContain("e1");
    expect(frame.changing).toContain("Pedido actual");
    expect(JSON.stringify(frame)).not.toMatch(/precio|gasto|carta/i);
  });
  it("keeps the same prefix regardless of unrelated card data", () => {
    const first = { ...source, card: "una" };
    const second = { ...source, card: "otra" };
    const a = buildMindFrame(scope, turn, first);
    const b = buildMindFrame(scope, turn, second);
    expect(renderMindFrame(a, "es").layers).toEqual(renderMindFrame(b, "es").layers);
    expect(JSON.stringify(a)).not.toContain("una");
  });
});
it("rejects a frame attributed to another mind", () => {
  expect(() =>
    buildMindFrame(scope, turn, { ...source, definition: { ...source.definition, actor: "mind:notas" } }),
  ).toThrow("Mente");
});

it("returns tooLarge through the turn port before any model call", () => {
  const port = createFramePort(() => source, { max: 0, bound: frame => JSON.stringify(frame).length });
  expect(port(scope, turn)).toEqual({ tooLarge: true });
});
it("uses the same cached four-layer prefix for two catalog cards", () => {
  const first = cards[0];
  const second = cards.find(card => card.model !== first?.model);
  if (!first || !second) throw new Error("Faltan cartas de prueba");
  const frame = renderMindFrame(buildMindFrame(scope, turn, source), "es");
  const request = {
    ...frame,
    maxOutputTokens: 100,
    schema: { type: "object", properties: {}, additionalProperties: false },
  };
  const a = requestBody({ ...request, card: first });
  const b = requestBody({ ...request, card: second });
  expect(a.system).toEqual(b.system);
  expect(a.system).toHaveLength(4);
  expect(a.system[3]).toMatchObject({ cache_control: { type: "ephemeral" } });
  expect(JSON.stringify(a.system)).not.toMatch(/precio|gasto|carta/i);
});
