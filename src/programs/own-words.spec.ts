// What DESERT itself says to a person is held to what it asks of every program: it is checked here, word by word.
import { describe, expect, it } from "vitest";
import { hideable } from "../catalogs/acts.ts";
import { addresses } from "../catalogs/addressing.ts";
import { asked } from "../surface/bridge/asking-parts.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import { toolTexts as engine } from "../texts/tools.texts.ts";
import { short, worded } from "../tools/promises.ts";
import { composed } from "./promised.ts";

/** Every text under a set of words, with where it is; what a text is built from is said with specimen words. */
const textsIn = (words: unknown, path = ""): [string, string][] => {
  if (typeof words === "string") return [[path, words]];
  if (typeof words === "function") return textsIn(Reflect.apply(words, undefined, ["uno", "dos", "tres"]), path);
  if (words === null || typeof words !== "object") return [];
  return Object.entries(words).flatMap(([key, value]) => textsIn(value, path ? `${path}.${key}` : key));
};
const causes = ["invalid", "unknown", "unattended", "unassigned", "unavailable", "interrupted", "draft"] as const;
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
    for (const cause of [...causes.map(name => engine[name]), generic.notHeld])
      expect(() => short(cause), cause).not.toThrow();
  });

  it("says a list with nothing in it as what is missing: Sin, the thing, a full stop", () => {
    const empty = [surface.nothingNeeds, surface.nothingNew, surface.nothingFound, surface.house.noJourneys];
    expect(empty.filter(text => !/^Sin [\p{Ll} ]+\.$/u.test(text))).toEqual([]);
  });

  it("words each preference as any datum that is changed where it is read", () => {
    for (const what of hideable) {
      const { name } = preferences[what];
      expect(() => worded({ name }), name).not.toThrow();
      expect(() => asked(name), name).not.toThrow();
      for (const how of [preferences.shown, preferences.hidden]) {
        expect(composed.test(preferences.now(name, how)), how).toBe(true);
        expect(how).toBe(how.toLowerCase());
      }
    }
    expect(() => worded({ name: "guardar", enter: preferences.save })).not.toThrow();
  });
});
