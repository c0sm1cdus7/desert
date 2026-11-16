// The current set can be reached by marking without becoming a rejection or a submission.
import { expect, it } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { option, someOf } from "../../fields/fields.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { programAct } from "../../tools/promises.ts";
import { anyToolScreen } from "../../surface/bridge/views/any-tool.ts";
import {
  shopProgram,
  shopShown,
  salesTool,
  paymentsTool,
  registerOffer,
  type Shop,
} from "../../../tests/support/shop.ts";
import { programChecks } from "../program-checks.ts";
import { cast, staged } from "./promised-stage.ts";
import { seated, type, view } from "./promised-keys.ts";
import { choiceChecks } from "./choices/promised-choices.ts";

const input = object({ marks: someOf("Marcas", "none", option("a", "A", "a"), option("b", "B", "b")) });
const act = programAct<Shop, typeof input>({
  ...registerOffer,
  name: "marcar",
  enter: "marcar",
  key: "m",
  input,
  stops: ({ marks }) => (Array.isArray(marks) && marks.length === 2 ? toolTexts.unchanged : undefined),
  run: () => ({ status: "accepted", text: "Marcado · Conjunto" }),
  cases: [
    { promise: "changes the set", input: { marks: ["a"] }, then: { says: "Marcado · Conjunto", facts: [] } },
    { promise: "keeps the set", input: { marks: ["a", "b"] }, then: { refused: toolTexts.unchanged } },
  ],
});
const program = { ...shopProgram, registry: [salesTool, { ...paymentsTool, acts: { mark: act } }] };
for (const check of programChecks(program, shopShown)) it(check.name, check.run);
it("keeps the current marks without Enter or a refusal, then submits a changed set", () =>
  staged(program, async ({ house }) => {
    const seat = seated(house(), cast.admin, shopShown);
    try {
      type(seat.router, "pm ");
      seat.router.send({ kind: "down" });
      type(seat.router, " ");
      const screen = seat.router.screen(view);
      expect(screen.body.kind === "thread" && screen.body.options?.map(row => row.key)).toEqual(["x", "x"]);
      expect(screen.hints.some(hint => hint.intent === "confirm")).toBe(false);
      expect(JSON.stringify(screen)).not.toMatch(/sin cambios|Error/);
      seat.router.send({ kind: "confirm" });
      expect(seat.router.screen(view)).toEqual(screen);
      expect(seat.requests).toEqual([]);
      type(seat.router, " ");
      seat.router.send({ kind: "confirm" });
      await seat.router.idle();
      expect(seat.requests.filter(request => request.act === "mark")).toHaveLength(1);
      expect(JSON.stringify(seat.router.screen(view))).toContain("Listo");
    } finally {
      seat.router.stop();
    }
  }));
it("rejects a screen that forgets the rule for the combination", async () => {
  const shown = {
    ...shopShown,
    screens: {
      payments: (...args: Parameters<typeof anyToolScreen<Shop>>) => {
        const plain = anyToolScreen(...args);
        return {
          ...plain,
          acts: Object.fromEntries(
            Object.entries(plain.acts).map(([name, act]) => {
              const { stops, ...rest } = act;
              expect(stops).toBeDefined();
              return [name, rest];
            }),
          ),
        };
      },
    },
  };
  const checks = choiceChecks(program, shown);
  expect(checks.length).toBeGreaterThanOrEqual(2);
  for (const check of checks.filter(check => check.name.startsWith("payments")))
    await expect(check.run()).rejects.toThrow("An unchanged set of marks can be submitted");
});
