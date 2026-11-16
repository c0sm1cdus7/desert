// An indexed edit cannot name one whole current input: its stops rule recognizes today's answer for each item.
import { object } from "../../src/fields/visible-text.ts";
import { oneOf, option, text, thing } from "../../src/fields/fields.ts";
import { toolTexts } from "../../src/texts/tools.texts.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, registerOffer, salesTool, shopProgram, type Shop } from "./shop.ts";

type Mode = "one" | "text" | "pick";
function valueField(mode: Mode) {
  if (mode === "pick") return thing("Valor", "sales", undefined, undefined, "sin ventas");
  return mode === "text"
    ? text("Valor", "Nombre del valor")
    : oneOf("Valor", option("old", "Anterior", "a"), option("new", "Nuevo", "n"));
}
export function unchangedShop(mode: Mode): Composition<Shop> {
  const field = valueField(mode);
  const input = object({
    item: oneOf("Artículo", option("1", "Primero", "p"), option("2", "Segundo", "s")),
    value: field,
  });
  const old = mode === "pick" ? "sales/s1" : "old";
  const fresh = mode === "pick" ? "sales/s2" : "new";
  const given = ["s1", "s2"].map(sale => ({ act: "register", on: "sales", input: { sale, total: 100 } }));
  const act = programAct<Shop, typeof input>({
    ...registerOffer,
    name: "ajustar",
    enter: "ajustar",
    key: "a",
    input,
    stops: ({ item, value }) => (value === (item === "1" ? old : fresh) ? toolTexts.unchanged : undefined),
    run: () => ({ status: "accepted", text: "Ajustado · Artículo" }),
    cases: [
      {
        promise: "changes the first item",
        given,
        input: { item: "1", value: fresh },
        then: { says: "Ajustado · Artículo", facts: [] },
      },
      {
        promise: "keeps the first item",
        given,
        input: { item: "1", value: old },
        then: { refused: toolTexts.unchanged },
      },
      {
        promise: "keeps the second item",
        given,
        input: { item: "2", value: fresh },
        then: { refused: toolTexts.unchanged },
      },
    ],
  });
  return { ...shopProgram, registry: [salesTool, { ...paymentsTool, acts: { ...paymentsTool.acts, adjust: act } }] };
}
