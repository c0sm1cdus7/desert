// What a walk keeps of what was answered after an answer that changed.
import { describe, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { digits, oneOf, option, text, when } from "../catalogs/fields.ts";
import { asking } from "./bridge/asking.ts";
import { keptAfter } from "./kept-answers.ts";
import { formats } from "./masks.ts";
import type { Asking } from "./screen.ts";

const words = {
  formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
  optionalMark: "",
};
const kinds = oneOf("Tipo", option("cuit", "CUIT", "c"), option("cuil", "CUIL", "l"));
const elevens = ({ number }: Readonly<Record<string, unknown>>): boolean => String(number).length === 11;
/** A document whose kind is asked only of an eleven-digit number; then two things that read the same. */
const document = object({
  number: digits("Documento", "##.###.###", "##-########-#"),
  kind: when(kinds, elevens),
  name: text("Nombre", "Nombre"),
});
const act = asking(document, words);
/** A walk on the first question, begun with what the thing already has. */
const on = (answers: readonly string[]): Asking => ({
  kind: "act",
  tool: "people",
  act: "edit",
  answers,
  asked: [],
  pos: 0,
  floor: 0,
  carried: true,
  typed: "",
  caret: 0,
  at: 0,
  marks: [],
  suggested: false,
  phase: "asking",
});

describe("what was answered after an answer that changed", () => {
  it("stays as it was while the same questions are asked", () => {
    expect(keptAfter(act, on(["20123456786", "CUIT", "Pepe"]), "27123456780")).toEqual(["CUIT", "Pepe"]);
  });

  it("drops what answered a question no longer asked, and keeps the rest under its own question", () => {
    expect(keptAfter(act, on(["20123456786", "CUIT", "Pepe"]), "12345678")).toEqual(["Pepe"]);
    expect(act.input(["12345678", "Pepe"])).toEqual({ number: "12345678", name: "Pepe" });
  });

  it("stops at a question that is newly asked: nothing answers it, and what comes after is asked again", () => {
    expect(keptAfter(act, on(["12345678", "Pepe"]), "20123456786")).toEqual([]);
  });
});
