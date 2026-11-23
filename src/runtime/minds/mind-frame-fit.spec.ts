import { expect, it } from "vitest";
import { fitMindFrame } from "./mind-frame-fit.ts";
import { buildMindFrame, type MindFrame } from "./mind-frame.ts";
import { defineMessage } from "../../fields/messages.ts";
import { object } from "../../fields/visible-text.ts";
import { turnLimits } from "../../tools/minds/mind-contract.ts";
const mind = defineMessage({
  id: "test.rules",
  kind: "mind",
  parameters: object({}),
  texts: { en: "You are Nora.", es: "Sos Nora." },
});
const scope = { kind: "consciousness", actor: "assistant:franco" } as const;
const turn = {
  id: "t",
  scope,
  language: "es",
  wake: ["despertar"],
  through: 3,
  limits: turnLimits,
  usage: { calls: 0, corrections: 0, consultations: 0 },
} as const;
/** The trimming under test is of the changing part: the house layer's own length stays out of the measure. */
const size = (frame: MindFrame) => JSON.stringify(frame).length - JSON.stringify(frame.layers[0]).length;
const snapshot = buildMindFrame(scope, turn, {
  definition: { role: "assistant", actor: scope.actor, rules: mind, communication: [] },
  skills: [],
  textRules: [],
  scene: "escena",
  required: "consultation",
  menu: "",
  activity: [
    { id: "a", text: "á".repeat(300), covered: true },
    { id: "a", text: "á".repeat(300), covered: true },
  ],
  objects: [],
  thread: [],
});
it("reports omissions while retaining wake and required context", () => {
  const result = fitMindFrame(snapshot, "es", { max: 349, bound: size });
  expect(result.tooLarge).toBe(false);
  if (!result.tooLarge) {
    expect(result.frame.changing).toContain("despertar");
    expect(result.frame.changing).toContain("consultation");
    expect(result.omitted).toContain("a");
  }
});
it("says under Omitido how much of each section did not fit, never which ids", () => {
  const long = "f".repeat(64);
  const rich = {
    ...snapshot,
    activity: [{ id: long, text: "á".repeat(300), covered: true }],
    objects: [{ id: "obj", text: "o".repeat(300) }],
  };
  const result = fitMindFrame(rich, "es", { max: 349, bound: size });
  expect(result.tooLarge).toBe(false);
  if (!result.tooLarge) {
    expect(result.omitted).toEqual([long, "obj"]);
    expect(result.frame.changing).not.toContain(long);
    expect(result.frame.changing).toContain("Omitido:\nActividad: 1 · Objetos: 1");
  }
});
it("refuses when even the minimum does not fit", () => {
  expect(fitMindFrame(snapshot, "es", { max: 1, bound: frame => JSON.stringify(frame).length })).toEqual({
    tooLarge: true,
  });
});
it("preserves uncovered activity and drops whole objects before older thread entries", () => {
  const rich = {
    ...snapshot,
    activity: [{ id: "new", text: "nuevo" }],
    objects: [{ id: "obj", text: "o".repeat(200) }],
    thread: [{ id: "old", text: "h".repeat(200) }],
  };
  const minimum = fitMindFrame(rich, "es", { max: 1, bound: frame => JSON.stringify(frame).length });
  expect(minimum).toEqual({ tooLarge: true });
  const result = fitMindFrame(rich, "es", { max: 499, bound: size });
  expect(result.tooLarge).toBe(false);
  if (!result.tooLarge) {
    expect(result.omitted[0]).toBe("obj");
    expect(result.frame.changing).toContain("nuevo");
  }
});
it("rejects an invalid bound instead of assuming a token estimate", () => {
  expect(() => fitMindFrame(snapshot, "es", { max: 100, bound: () => Number.NaN })).toThrow("Cota");
});
