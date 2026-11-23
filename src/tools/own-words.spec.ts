// What DESERT itself says to a person is held to what it asks of every program: it is checked here, word by word.
import { describe, expect, it } from "vitest";
import { languages } from "../fields/languages.ts";
import { isPhrase, meant, said, wordsIn, type Text } from "../fields/phrases.ts";
import { composed } from "../checks/promises/cases/promised.ts";
import { hideable } from "../house/own-acts.ts";
import { asked } from "../surface/bridge/questions/asking-parts.ts";
import { addresses } from "../texts/addressing.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { short, worded } from "./act-words.ts";

/** Every text under a set of words, with where it is; what a text is built from is said with specimen words. */
const textsIn = (words: unknown, path = ""): [string, Text][] => {
  if (typeof words === "string" || isPhrase(words)) return [[path, words]];
  if (typeof words === "function") return textsIn(Reflect.apply(words, undefined, ["one", "two", "three"]), path);
  if (words === null || typeof words !== "object") return [];
  return Object.entries(words).flatMap(([key, value]) => textsIn(value, path ? `${path}.${key}` : key));
};
const engine = { ...toolTexts, unavailable: "acción fallida" };
const causes = [
  "invalid",
  "unknown",
  "unattended",
  "unassigned",
  "outsideKit",
  "unavailable",
  "interrupted",
  "draft",
] as const;
const preferences = generic.preferences;

describe("what DESERT itself says to a person", () => {
  it("speaks to nobody: no text of the surface, of the bridge or of the engine addresses who reads it", () => {
    const read = [...textsIn(surface), ...textsIn(generic), ...textsIn(engine)];
    const speaking = read.filter(([path, text]) => path !== "talk.you" && addresses(text));
    expect(speaking).toEqual([]);
  });

  it("knows who is spoken to by their pronouns, the orders given them and the verbs said to them", () => {
    const spoken = [
      "Anota a quien le vendés",
      "Escribí para buscar.",
      "No está entre tus herramientas",
      "Qué preferís",
    ];
    const plain = ["Después de cobrar", "Sin pendientes.", "Además, el país", "Total · $ 100", "más tarde", "se usa"];
    const did = ["Cambiaste · CUIT · 20-12345678-6", "Ya la registraste", "Pediste un envío"];
    const notDone = ["No existe", "Consiste en dos pasos", "Contraste alto", "Registrado · s1"];
    expect([...spoken, ...did].filter(text => !addresses(text))).toEqual([]);
    expect([...plain, ...notDone].filter(addresses)).toEqual([]);
  });

  it("refuses with causes that stand to the right of a row: short, and with no full stop", () => {
    for (const cause of [...causes.map(name => engine[name]), engine.unassigned])
      expect(() => short(cause), meant(cause)).not.toThrow();
  });

  it("says a list with nothing in it as what is missing: Sin, or Nothing or No, the thing, a full stop", () => {
    const empty = [surface.nothingNeeds, surface.nothingNew, surface.nothingFound];
    const missing = { es: /^Sin [\p{Ll} ]+\.$/u, en: /^(Nothing|No) [\p{Ll} ]+\.$/u };
    for (const language of languages)
      expect(empty.map(text => text[language]).filter(text => !missing[language].test(text))).toEqual([]);
    expect(missing.es.test("Sin viajes.")).toBe(true);
  });

  it("words each preference as any datum that is changed where it is read", () => {
    for (const language of languages) {
      const words = wordsIn(preferences, language);
      for (const what of hideable) {
        const { name } = words[what];
        expect(() => worded({ name }), name).not.toThrow();
        expect(() => asked(name), name).not.toThrow();
        for (const how of [words.shown, words.hidden]) {
          expect(composed.test(said(preferences.now(name, how), language)), how).toBe(true);
          expect(how).toBe(how.toLowerCase());
        }
      }
      expect(() => worded({ name: words.save, enter: words.save })).not.toThrow();
    }
  });

  it("takes what an act says in several lines when the first says what it did", () => {
    expect(composed.test("Importado · Catálogo · 3 artículos\nCafé en grano\nFiltros de papel")).toBe(true);
    expect(composed.test("FACTURA A\nImpresa · Factura A 0001-00000001")).toBe(false);
    expect(composed.test("Se importó el catálogo.\nImportado · Catálogo")).toBe(false);
    expect(composed.test("Importado · \nCatálogo")).toBe(false);
  });
});
