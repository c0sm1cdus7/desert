import { afterEach, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { effect, houseCatalog } from "../facts.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { mindEffects } from "../../../tests/support/mind-facts.ts";
import { modelAccount } from "./model-call-state.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
const open = () => {
  const rig = shopRig();
  rigs.push(rig);
  return rig;
};
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const by = "assistant:beto";
it.each(mindEffects(by))("$kind rechaza campos ausentes y extra", event => {
  const schema = houseCatalog[event.kind];
  expect(Value.Check(schema, event.data)).toBe(true);
  expect(Value.Check(schema, {})).toBe(false);
  expect(Value.Check(schema, { ...event.data, by: "ana" })).toBe(false);
});
it("reconstruye turnos, consulta, revisión y escenas tras reabrir; los mensajes nativos viejos no dejan estado", () => {
  const rig = open();
  for (const event of mindEffects(by, "ana").filter(
    event => event.kind.startsWith("mind-") && event.kind !== "mind-card-assigned",
  ))
    rig.bus.emit(event);
  const before = rig.state().house.minds;
  expect(before.turns.get("t1")?.answer?.data.source).toBe("unconfigured");
  expect(before.scenes.get(by)?.data.text).toBe("Preparando");
  expect(rig.facts().some(event => event.kind === "mind-message")).toBe(true);
  expect(Object.keys(before)).toEqual(["turns", "scenes"]);
  expect(JSON.stringify([...before.turns])).not.toContain("card");
  rig.restart();
  expect(rig.state().house.minds).toEqual(before);
  expect(() => rig.bus.emit(effect("mind-scene", { turn: "t1", text: "Tarde" }, by))).toThrow();
});
it("rejects card publication by the assistant without recording it", () => {
  const rig = open();
  const publication = effect("mind-cards-published", { mind: by, cards: [] }, by);
  const before = rig.facts();
  expect(() => rig.bus.emit(publication)).toThrow("card.admin");
  expect(rig.facts()).toEqual(before);
  expect(rig.state().house.mindCards.size).toBe(0);
});
it("rechaza consulta duplicada, respuesta sin pregunta, autor cambiado y turnos simultáneos", () => {
  const rig = open();
  rig.bus.emit(effect("mind-turn-opened", { turn: "t1", wake: [] }, by));
  expect(() => rig.bus.emit(effect("mind-turn-opened", { turn: "t2", wake: [] }, by))).toThrow();
  expect(() =>
    rig.bus.emit(effect("mind-consultation-answered", { turn: "t1", answer: "Sí", source: "supervisor" }, by)),
  ).toThrow();
  rig.bus.emit(effect("mind-consultation-requested", { turn: "t1", question: "¿Sigo?", acts: [] }, by));
  expect(() =>
    rig.bus.emit(effect("mind-consultation-requested", { turn: "t1", question: "¿Otra?", acts: [] }, by)),
  ).toThrow();
  expect(() => rig.bus.emit(effect("mind-scene", { turn: "t1", text: "Ajena" }, "mind:sales"))).toThrow();
  expect(() =>
    rig.bus.emit(effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 0, applied: [] }, by)),
  ).toThrow();
});
it("la incertidumbre conserva reserva y una liquidación posterior no duplica gasto al reabrir", () => {
  const rig = open();
  const events = mindEffects(by).filter(event => event.kind.startsWith("model-call-"));
  for (const event of events.filter(event =>
    ["model-call-reserved", "model-call-started", "model-call-uncertain"].includes(event.kind),
  ))
    rig.bus.emit(event);
  expect(modelAccount(rig.state().house.modelCalls, "test")).toEqual({ spentNanoUsd: 0, reservedNanoUsd: 100 });
  const before = rig.state().house.modelCalls;
  rig.restart();
  expect(rig.state().house.modelCalls).toEqual(before);
  expect(() => rig.bus.emit(effect("model-call-cancelled", { call: "c1" }, by))).toThrow();
  const settled = events.find(event => event.kind === "model-call-settled");
  if (!settled) throw new Error("Falta liquidación");
  rig.bus.emit(settled);
  expect(modelAccount(rig.state().house.modelCalls, "test")).toEqual({ spentNanoUsd: 70, reservedNanoUsd: 0 });
  expect(() => rig.bus.emit(settled)).toThrow();
  rig.restart();
  expect(modelAccount(rig.state().house.modelCalls, "test").spentNanoUsd).toBe(70);
});
it("solo permite cancelar antes del envío y no consume un intento físico al cancelar", () => {
  const rig = open();
  for (const call of ["cancelled", "sent"]) {
    rig.bus.emit(effect("model-call-reserved", { call, turn: "t", account: "test", number: 1, maximumNanoUsd: 3 }, by));
    if (call === "cancelled") rig.bus.emit(effect("model-call-cancelled", { call }, by));
  }
  rig.bus.emit(effect("model-call-started", { call: "sent" }, by));
  expect(() => rig.bus.emit(effect("model-call-cancelled", { call: "sent" }, by))).toThrow();
  expect(() =>
    rig.bus.emit(
      effect("model-call-reserved", { call: "other", turn: "t", account: "test", number: 2, maximumNanoUsd: 3 }, by),
    ),
  ).toThrow();
});
it("mente y supervisor comparten doce intentos: rechaza el 13, duplicados y saltos", () => {
  const rig = open();
  const usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  for (let number = 1; number <= 12; number++) {
    const actor = number % 2 ? by : "mind:supervisor";
    const call = `c${number}`;
    rig.bus.emit(effect("model-call-reserved", { call, turn: "t", account: "test", number, maximumNanoUsd: 3 }, actor));
    rig.bus.emit(effect("model-call-started", { call }, actor));
    rig.bus.emit(effect("model-call-settled", { call, actualNanoUsd: 2, usage }, actor));
  }
  expect(modelAccount(rig.state().house.modelCalls, "test")).toEqual({ spentNanoUsd: 24, reservedNanoUsd: 0 });
  for (const number of [1, 13, 15])
    expect(() =>
      rig.bus.emit(
        effect(
          "model-call-reserved",
          { call: `c${number}`, turn: "t", account: "test", number, maximumNanoUsd: 3 },
          by,
        ),
      ),
    ).toThrow();
  expect(() => rig.bus.emit(effect("model-call-settled", { call: "c1", actualNanoUsd: -1, usage }, by))).toThrow();
});

it("no informa saldo cero cuando falta la cuenta", () => {
  expect(() => {
    Reflect.apply(modelAccount, undefined, [new Map()]);
  }).toThrow("account");
});
