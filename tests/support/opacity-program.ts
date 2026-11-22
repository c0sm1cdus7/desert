// Entirely synthetic material; this program has no external service or model provider.
import { Type, type TSchema } from "@sinclair/typebox";
import { programAct, type Composition, type Case, type ProgramAct } from "../../src/tools/promises.ts";
import type { Shop } from "./shop.ts";
import { shopWith } from "./shop-variants.ts";
export const opacityInput = Type.Object({
  first: Type.String({ secret: true, title: "Primer material", maxLength: 4000 }),
  second: Type.String({ secret: true, title: "Segundo material", maxLength: 4000 }),
});
const example = (value: string): Case<Shop> => ({
  promise: `material ${value.length}`,
  input: { first: value, second: value },
  then: { facts: [], says: "Material · Guardado", sure: "Material · Confirmar" },
});
const tool = (act: ProgramAct<Shop>) => ({
  id: "vault",
  purpose: "guardar material",
  acts: { set: act, another: { ...act, key: "o", name: "other" } },
  targets: () => [],
  summary: () => "Material",
  view: () => "",
});
export function opacityProgram(
  input: TSchema = opacityInput,
  cases?: readonly [Case<Shop>, ...Case<Shop>[]],
  seen: unknown[] = [],
): Composition<Shop> {
  const act = programAct<Shop, TSchema>({
    input,
    name: "guardar",
    enter: "guardar",
    purpose: "guardar material",
    key: "g",
    on: "tool",
    undoable: true,
    confirms: value => {
      seen.push(value);
      return "Material · Confirmar";
    },
    stops: value => {
      seen.push(value);
      return undefined;
    },
    cases: cases ?? [example(""), ...["x", "abcdefghijk", "sale-registered", "UNO\nDOS"].map(example)],
    run: value => {
      seen.push(value);
      return { status: "accepted", text: "Material · Guardado" };
    },
  });
  return shopWith({ more: [tool(act)] });
}
