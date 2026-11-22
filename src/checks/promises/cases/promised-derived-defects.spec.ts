// Passing realistic examples must never make compiling broken screens pass.
import { expect, it } from "vitest";
import { derivedShop, derivedShown, derivedWords } from "../../../../tests/support/derived-shop.ts";
import { partsShown, correctingShop, totalCorrected } from "../../../../tests/support/correcting-shop.ts";
import { anyToolScreen } from "../../../surface/bridge/views/any-tool.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { Shop } from "../../../../tests/support/shop.ts";
import { walkedChecks } from "../walk/promised-walk.ts";
import { quietScreen } from "../answers/promised-entry.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";

it("names an unexplained missing path and the question, even in a refusal case", async () => {
  const program = {
    ...correctingShop,
    registry: correctingShop.registry.map(tool => ({
      ...tool,
      acts: Object.fromEntries(
        Object.entries(tool.acts).map(([name, act]) => [
          name,
          {
            ...act,
            cases: act.cases.map(kase =>
              kase.promise === totalCorrected.split(" · ").at(-1)
                ? { ...kase, input: { total: 2000, paid: 500 }, then: { refused: "overpaid" } }
                : kase,
            ),
          },
        ]),
      ),
    })),
  };
  const check = walkedChecks(program, partsShown).find(check => check.name === `${totalCorrected}, by keys`);
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow(
    "No screen path at Cobrado: neither a declared cause nor an unwriteable datum",
  );
});
it("rejects a disabled row whose cause is removed from the actual screen", async () => {
  const hidden: Shown<Shop> = {
    ...derivedShown(),
    screens: {
      sales: (ports, tool, words, acts, start) => {
        const plain = anyToolScreen(ports, tool, words, acts, start);
        return {
          ...plain,
          actsOn: Object.fromEntries(
            Object.entries(plain.actsOn ?? {}).map(([name, act]) => [
              name,
              name === "archive" ? { ...act, listed: () => false } : act,
            ]),
          ),
        };
      },
    },
  };
  const check = walkedChecks(derivedShop(), hidden).find(check => check.name.endsWith("reads a closed sale, by keys"));
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow("No screen path");
});
it("compares entire reasons in reason positions, preserving legitimate text elsewhere", () => {
  const body = {
    kind: "thread",
    events: [{ nested: true, text: [{ text: derivedWords.cause, tone: "t3" }] }],
    entry: { typed: "", caret: 0, placeholder: "Monto", keyboard: "digits" },
  } as const;
  const screen = { title: "Venta", state: "connected", clock: "00:00", menu: false, hints: [], body } as const;
  expect(() => quietScreen(screen)).not.toThrow();
  expect(() =>
    quietScreen({
      ...screen,
      body: { ...body, events: [{ nested: true, text: [{ text: toolTexts.unchanged, tone: "t3" }] }] },
    }),
  ).toThrow();
  expect(() =>
    quietScreen({
      ...screen,
      body: {
        kind: "list",
        stacks: [{ title: "Dato", rows: [{ title: "Nota", detail: toolTexts.unchanged, still: true }] }],
      },
    }),
  ).not.toThrow();
});
