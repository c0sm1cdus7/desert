// The maker is an alternative way to answer, so every program must meet the same question on its return.
import { describe, expect, it } from "vitest";
import type { Field } from "../../src/surface/contract.ts";
import type { Tool } from "../../src/surface/shown-tool.ts";
import { begin, type Done } from "../../src/surface/screen.ts";
import { walking } from "../../src/surface/walking.ts";
import { narrowed } from "../../src/surface/bridge/questions/picked-options.ts";

type Gate = "among" | "valid" | "stops";
function toolsFor(gate: Gate): readonly Tool[] {
  const bare: Field & { kind: "pick" } = {
    kind: "pick",
    ask: "Cosa",
    of: "things",
    nothing: () => "sin cosas",
    shown: value => value,
    found: () => [
      { title: "Nueva", value: "new" },
      { title: "Otra", value: "other" },
    ],
    valid: value => gate !== "valid" || value !== "new",
  };
  const field = narrowed(
    bare,
    value => (gate === "among" && value === "new" ? "no admitida" : undefined),
    () => false,
  );
  return [
    {
      id: "things",
      name: "Cosas",
      place: { key: "c", section: "tools" },
      summary: () => "cosas",
      view: () => [],
      acts: {
        take: {
          scope: "all",
          label: "tomar",
          verb: "tomar",
          next: answers => (answers.length ? null : field),
          stops: answers => (gate === "stops" && answers[0] === "new" ? "no admitida" : undefined),
          run: () => Promise.resolve({ ok: true, text: "Tomada" }),
        },
      },
    },
  ];
}
describe("migration: creation never bypasses the receiving question", () => {
  for (const gate of ["among", "valid", "stops"] satisfies readonly Gate[]) {
    it(`rechecks ${gate} before changing answers or requesting execution`, () => {
      const tools = toolsFor(gate);
      const parent = begin(tools, "things", "take");
      const created: Done = { ...parent, phase: "done", done: "Creada", returns: true, made: "new" };
      const result = walking([parent, created], created, tools, { kind: "cancel" }, 1);
      expect(result.run).toBeUndefined();
      expect(result.session).toHaveLength(1);
      expect(result.session[0]).toMatchObject({
        phase: "asking",
        pos: 0,
        answers: [],
        asked: [],
        error: gate === "valid" ? "datos inválidos" : "no admitida",
      });
    });
  }
});
