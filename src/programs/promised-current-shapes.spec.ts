// Repeating today's data through the cases: choices, text, optional fields and conditional questions.
import { Value } from "@sinclair/typebox/value";
import { Type, type TSchema } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { oneOf, option, someOf, text, thing, when } from "../catalogs/fields.ts";
import { programAct } from "../tools/promises.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { shopProgram, shopShown, type Shop } from "../../tests/support/shop.ts";
import { walkedChecks } from "./promised-walk.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { seated, type, view } from "./promised-keys.ts";

const choice = oneOf("Modo", option("yes", "Sí", "s"), option("no", "No", "n"));
const name = text("Nombre", "Nombre");
const samples = [
  { name: "one choice", schema: object({ choice }), current: { choice: "yes" }, changed: { choice: "no" } },
  {
    name: "last text",
    schema: object({ choice, name }),
    current: { choice: "yes", name: "Ana" },
    changed: { choice: "yes", name: "Beto" },
  },
  {
    name: "last choice",
    schema: object({ name, choice }),
    current: { name: "Ana", choice: "yes" },
    changed: { name: "Beto", choice: "yes" },
  },
  {
    name: "optional blanks",
    schema: object({ first: Type.Optional(name), second: Type.Optional(text("Otro", "Otro")) }),
    current: {},
    changed: { first: "Ana" },
  },
  {
    name: "conditional",
    schema: object({ choice, name: when(name, given => given.choice === "yes") }),
    current: { choice: "yes", name: "Ana" },
    changed: { choice: "no" },
  },
  {
    name: "marked options",
    schema: object({ names: someOf("Nombres", "none", option("ana", "Ana", "a"), option("beto", "Beto", "b")) }),
    current: { names: ["ana"] },
    changed: { names: ["beto"] },
  },
];
function program(schema: TSchema, current: unknown, changed: unknown) {
  const edit = programAct<Shop, TSchema>({
    name: "cambiar",
    enter: "cambiar",
    purpose: "datos de la venta",
    key: "c",
    on: "tool",
    undoable: true,
    input: schema,
    today: () => current,
    run: input => {
      expect(Value.Equal(input, changed)).toBe(true);
      return { status: "accepted", text: "Cambiado · Datos", effects: [] };
    },
    cases: [
      { promise: "changes data", input: changed, then: { says: "Cambiado · Datos", facts: [] } },
      { promise: "keeps current data", input: current, then: { refused: toolTexts.unchanged } },
    ],
  });
  return {
    ...shopProgram,
    registry: shopProgram.registry.map(tool =>
      tool.id === "sales" ? { ...tool, acts: { ...tool.acts, edit } } : tool,
    ),
  };
}
for (const sample of samples)
  describe(sample.name, () => {
    const shop = program(sample.schema, sample.current, sample.changed);
    for (const check of walkedChecks(shop, shopShown).filter(check => check.name.startsWith("sales · edit ·")))
      it(check.name, check.run);
  });
describe("normalized current text", () => {
  it("does not offer or act on Enter for the same text with trailing whitespace", () =>
    staged(program(object({ name }), { name: "Ana" }, { name: "Beto" }), async ({ house }) => {
      const { router } = seated(house(), cast.admin, shopShown);
      try {
        type(router, "vcAna ");
        const before = router.screen(view);
        expect(before.hints.some(hint => hint.intent === "confirm")).toBe(false);
        router.send({ kind: "confirm" });
        await router.idle();
        expect(router.screen(view)).toEqual(before);
        expect(JSON.stringify(before)).not.toContain(toolTexts.unchanged);
      } finally {
        router.stop();
      }
    }));
});

describe("a current thing among references", () => {
  it("skips it on opening, by number and while searching, without showing an error", () =>
    staged(
      program(object({ sale: thing("Venta", "sales") }), { sale: "sales/s1" }, { sale: "sales/s2" }),
      async ({ house }) => {
        await given(house(), "sales", [
          { act: "register", input: { sale: "s1", total: 100 } },
          { act: "register", input: { sale: "s2", total: 200 } },
        ]);
        const { router } = seated(house(), cast.admin, shopShown);
        const rows = () => {
          const body = router.screen(view).body;
          return body.kind === "thread" ? body.options : [];
        };
        try {
          type(router, "vc");
          expect(rows()?.find(row => row.off)).toMatchObject({ title: "s1", detail: "actual", selected: false });
          expect(rows()?.find(row => row.selected)?.title).toBe("s2");
          const before = router.screen(view);
          type(router, "1");
          expect(router.screen(view)).toEqual(before);
          type(router, " s1");
          expect(rows()?.some(row => row.selected)).toBe(false);
          expect(router.screen(view).hints.some(hint => hint.intent === "confirm")).toBe(false);
          router.send({ kind: "confirm" });
          expect(JSON.stringify(router.screen(view))).not.toContain("sin cambios");
          router.send({ kind: "cancel" });
          expect(rows()?.find(row => row.selected)?.title).toBe("s2");
        } finally {
          router.stop();
        }
      },
    ));
});
