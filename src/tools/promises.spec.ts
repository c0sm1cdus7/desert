// What an act cannot be declared with: its words are checked when the program is composed, before anyone reads them.
import { describe, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { day } from "../catalogs/fields.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { programAct, type Offered } from "./promises.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { registerCases, registerOffer, shop, shopCatalog, shopRegistry, type Shop } from "../../tests/support/shop.ts";

const input = shopCatalog["sale-registered"];
type Parts = Partial<Offered> & Readonly<{ refuses?: readonly string[] }>;
/** Registering a sale, declared with other words, or with other causes. */
const declared =
  ({ refuses = ["repeated"], ...words }: Parts) =>
  () =>
    programAct<Shop, typeof input>({
      ...registerOffer,
      ...words,
      input,
      refuses,
      run: (told, { by }) => ({
        status: "accepted",
        text: "Registrada",
        effects: [shop.fact("sale-registered", told, by)],
      }),
      cases: registerCases,
    });

describe("the words of a declared act", () => {
  it("takes a name that is what its row says, and one verb that confirms it", () => {
    expect(declared({})).not.toThrow();
    expect(declared({ name: "nueva venta", enter: "guardar" })).not.toThrow();
  });

  it("refuses a name that is a sentence, that carries punctuation, or that does not fit its row", () => {
    const sentence = "An act's name is a sentence, or too long for its row";
    expect(declared({ name: "Registrar una venta" })).toThrow(sentence);
    expect(declared({ name: "registrar, y cobrar" })).toThrow(sentence);
    expect(declared({ name: "registrar una venta que alguien hizo" })).toThrow(sentence);
  });

  it("refuses what confirms it when it is not one verb in lower case", () => {
    const verb = "What confirms an act is one verb in lower case";
    expect(declared({ enter: "Registrar" })).toThrow(verb);
    expect(declared({ enter: "registrar ya" })).toThrow(verb);
  });

  it("refuses a cause that reads as a sentence: with a full stop, or too long to stand by its row", () => {
    const sentence = "A cause reads as a sentence";
    expect(declared({ refuses: ["La venta ya estaba registrada."] })).toThrow(sentence);
    expect(declared({ refuses: ["la venta ya estaba registrada por alguien antes de ahora"] })).toThrow(sentence);
  });

  it("refuses a purpose that is a sentence, too long to stand beside its act, or that speaks to who reads it", () => {
    const beside = "A purpose is said beside its act, short and no sentence";
    expect(declared({ purpose: "Registra lo que el almacén vende." })).toThrow(beside);
    expect(declared({ purpose: "lo que el almacén vende cada día a cada persona que entra" })).toThrow(beside);
    expect(declared({ purpose: "" })).toThrow(beside);
    expect(declared({ purpose: "lo que vendés" })).toThrow("A purpose speaks to who reads it");
  });

  it("refuses a name or a cause that speaks to who reads it", () => {
    expect(declared({ name: "registrar tu venta" })).toThrow("An act's name speaks to who reads it");
    expect(declared({ refuses: ["ya la registraste vos"] })).toThrow("A cause speaks to who reads it");
  });

  it("refuses an act that cannot be undone, takes something, and does not say what it puts to be confirmed", () => {
    expect(declared({ undoable: false })).toThrow("An act that cannot be undone asks to be confirmed");
    const nothing = object({});
    const bare = () =>
      programAct<Shop, typeof nothing>({
        ...registerOffer,
        undoable: false,
        input: nothing,
        run: () => ({ status: "accepted", text: "Registrada", effects: [] }),
        cases: [{ promise: "nothing is asked", input: {}, then: { says: "Registrada", facts: [] } }],
      });
    expect(bare).not.toThrow();
  });
});

describe("a day the calendar does not have, given to an act", () => {
  const due = object({ on: day("Vence") });
  /** An act that takes a day and declares no cause of its own. */
  const dated = programAct<Shop, typeof due>({
    ...registerOffer,
    input: due,
    run: () => ({ status: "accepted", text: "Anotado" }),
    cases: [{ promise: "a day is noted", input: { on: "2026-02-28" }, then: { says: "Anotado", facts: [] } }],
  });
  const dates = { id: "dates", purpose: "Notes days.", targets: () => [], view: () => "", summary: () => "" };

  it("is refused by the base before the act runs, with a cause the act does not have to declare", () => {
    const rig = shopRig({ registry: [...shopRegistry, { ...dates, acts: { note: dated } }] });
    rig.attend("ana", "dates");
    const refused = rig.act("ana", "note", { on: "2026-02-30" }, "dates");
    const taken = rig.act("ana", "note", { on: "2026-02-28" }, "dates");
    rig.close();
    expect(refused).toMatchObject({ status: "rejected", reason: toolTexts.noSuchDay });
    expect(taken.status).toBe("accepted");
  });
});
