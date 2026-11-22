import { describe, expect, it } from "vitest";
import { createFramePort } from "../../../tests/support/retired-helpers/mind-frame-fit.ts";
import { requestBody } from "../../adapters/models/anthropic.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { defineMessage } from "../../fields/messages.ts";
import { object } from "../../fields/visible-text.ts";
import { turnLimits } from "../../tools/minds/mind-contract.ts";
import { renderMindFrame } from "./mind-frame-text.ts";
import { buildMindFrame } from "./mind-frame.ts";

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
  menu: "",
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
describe("the order of a frame", () => {
  const entries = Array.from({ length: 19 }, (_, index) => ({ id: `h${index}`, text: `Escena ${index}` }));
  const own = { kind: "journey", actor: "assistant:franco", process: "journey:x", kit: [] } as const;
  const later = { ...turn, scope: own, through: 9, wake: ["e2"] };
  const frameOf = (thread: typeof entries, through: number) =>
    renderMindFrame(
      buildMindFrame(own, { ...later, through }, { ...source, thread, menu: "resume → journey:x", now: through }),
      "es",
    );
  it("puts the menu in the stable layers and the thread's sealed blocks before what changes", () => {
    const frame = frameOf(entries, 9);
    expect(frame.layers[3]).toContain("Menú:\nresume → journey:x");
    expect(frame.changing).not.toContain("Menú:");
    expect(frame.kept).toHaveLength(2);
    expect(frame.kept?.[0]).toMatch(/^Hilo:\nh0: Escena 0\n/u);
    expect(frame.kept?.join("")).not.toContain("Escena 16");
    expect(frame.changing).toContain("h16: Escena 16");
    expect(frame.changing.startsWith("Alcance:")).toBe(true);
  });
  it("keeps the layers and every sealed block byte for byte when the next wake adds an entry", () => {
    const first = frameOf(entries, 9);
    const next = frameOf([...entries, { id: "h19", text: "Escena 19" }], 12);
    expect(next.layers).toEqual(first.layers);
    expect(next.kept?.slice(0, 2)).toEqual(first.kept);
    expect(next.changing).not.toEqual(first.changing);
  });
});
