import { expect, it } from "vitest";
import { fitMindFrame } from "./mind-frame-fit.ts";
import { buildMindFrame } from "./mind-frame.ts";
import { defineMessage } from "../../fields/messages.ts";
import { object } from "../../fields/visible-text.ts";
import { turnLimits } from "../../tools/minds/mind-contract.ts";
const mind = defineMessage({ id: "test.rules", kind: "mind", parameters: object({}), texts: { es: "Sos Nora." } });
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
const snapshot = buildMindFrame(scope, turn, {
  definition: { role: "asistente", actor: scope.actor, rules: mind, communication: [] },
  skills: [],
  textRules: [],
  scene: "escena",
  required: "consulta",
  activity: [
    { id: "a", text: "á".repeat(300), covered: true },
    { id: "a", text: "á".repeat(300), covered: true },
  ],
  objects: [],
  thread: [],
});
it("reports omissions while retaining wake and required context", () => {
  const result = fitMindFrame(snapshot, "es", { max: 500, bound: frame => JSON.stringify(frame).length });
  expect(result.tooLarge).toBe(false);
  if (!result.tooLarge) {
    expect(result.frame.changing).toContain("despertar");
    expect(result.frame.changing).toContain("consulta");
    expect(result.omitted).toContain("a");
    expect(result.frame.changing).toContain("a");
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
  const result = fitMindFrame(rich, "es", { max: 650, bound: frame => JSON.stringify(frame).length });
  expect(result.tooLarge).toBe(false);
  if (!result.tooLarge) {
    expect(result.omitted[0]).toBe("obj");
    expect(result.frame.changing).toContain("nuevo");
  }
});
it("rejects an invalid bound instead of assuming a token estimate", () => {
  expect(() => fitMindFrame(snapshot, "es", { max: 100, bound: () => Number.NaN })).toThrow("Cota");
});
