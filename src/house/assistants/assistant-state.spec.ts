import { afterEach, expect, it } from "vitest";
import { assistantOf, parseMindActor } from "../../fields/mind-actor.ts";
import { effect } from "../facts.ts";
import { allowedAct, present, holds } from "../kit.ts";
import { assistantOfIdentity, effectiveAssistantKit } from "./assistant-state.ts";
import { contractRig, desk, kit } from "../../../tests/support/contract-rig.ts";
const rigs: ReturnType<typeof contractRig>[] = [];
const open = () => {
  const rig = contractRig();
  rigs.push(rig);
  return rig;
};
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const actor = "assistant:beto";
function enable(rig: ReturnType<typeof contractRig>) {
  rig.bus.emit(effect("assistant-enabled", { owner: "beto", name: "Nora" }, "ana"));
  rig.bus.emit(
    effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "desk", acts: ["say", "open", "nested"] }] }, "beto"),
  );
  rig.bus.emit(
    effect("mind-card-assigned", { mind: actor, card: "test-card", version: "v1", capabilities: [] }, "ana"),
  );
}
it("separa actores y rechaza un titular ausente o que sea otra mente", () => {
  expect(assistantOf("beto")).toBe(actor);
  expect(parseMindActor(actor)).toEqual({ kind: "assistant", owner: "beto" });
  expect(parseMindActor("mind:desk")).toEqual({ kind: "tool", tool: "desk" });
  expect(parseMindActor("beto")).toBeUndefined();
  for (const owner of ["", "assistant:beto", "mind:desk"]) expect(() => assistantOf(owner)).toThrow();
});
it("el administrador habilita y asigna carta; solo el titular delega, incluso con otro administrador", () => {
  const rig = open();
  expect(() => rig.bus.emit(effect("assistant-enabled", { owner: "beto", name: "Nora" }, "beto"))).toThrow();
  enable(rig);
  expect(assistantOfIdentity(rig.state().house, "beto")?.name).toBe("Nora");
  expect(() => rig.bus.emit(effect("assistant-kit-set", { owner: "beto", kit: [] }, "ana"))).toThrow();
  expect(() =>
    rig.bus.emit(effect("mind-card-assigned", { mind: actor, card: "otra", version: "v1", capabilities: [] }, "beto")),
  ).toThrow();
  expect(present([desk], rig.state().house, actor)).toBe(true);
  expect(allowedAct(rig.state().house, actor, "desk", "say", [desk])).toBe(true);
});
it("intersecta delegación, permiso actual y capacidades; no hereda actos nuevos", () => {
  const rig = open();
  enable(rig);
  kit(rig, "beto", ["say"]);
  const registry = [{ id: "desk", acts: { say: { needs: ["sees"] as const }, open: {}, newAct: {} } }];
  expect(effectiveAssistantKit(rig.state().house, "beto", registry)).toEqual([]);
  rig.bus.emit(
    effect("mind-card-assigned", { mind: actor, card: "visual", version: "v1", capabilities: ["sees"] }, "ana"),
  );
  expect(effectiveAssistantKit(rig.state().house, "beto", registry)).toEqual([{ tool: "desk", acts: ["say"] }]);
  expect(() =>
    rig.bus.emit(effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "desk", acts: ["open"] }] }, "beto")),
  ).toThrow();
});
it("conserva el estado al reabrir y nunca convierte al asistente en identidad", () => {
  const rig = open();
  enable(rig);
  rig.bus.emit(effect("granted", { identity: actor, tools: ["desk"] }, "ana"));
  rig.bus.emit(effect("handed", { to: actor }, "ana"));
  expect(rig.state().house.grants.has(actor)).toBe(false);
  expect(rig.state().house.admin).toBe("ana");
  const before = rig.state().house;
  rig.restart();
  expect(rig.state().house).toEqual(before);
  rig.bus.emit(effect("assistant-disabled", { owner: "beto" }, "ana"));
  expect(present([desk], rig.state().house, actor)).toBe(false);
  expect(assistantOfIdentity(rig.state().house, "beto")?.name).toBe("Nora");
});
it("adopta sin reescribir autoría vieja y rechaza una colisión histórica", () => {
  const rig = open();
  rig.bus.emit(effect("granted", { identity: "nora", tools: ["desk"] }, "ana"));
  rig.bus.emit(effect("scene", { general: "Anterior" }, "nora"));
  rig.bus.emit(effect("removed", { identity: "nora" }, "ana"));
  enable(rig);
  rig.bus.emit(effect("assistant-adopted", { owner: "beto", legacy: "nora" }, "ana"));
  rig.bus.emit(effect("assistant-adopted", { owner: "beto", legacy: "nora" }, "ana"));
  expect(rig.state().house.scenes.get("nora")?.by).toBe("nora");
  expect(() => rig.bus.emit(effect("assistant-adopted", { owner: "beto", legacy: "ana" }, "ana"))).toThrow();
  const before = rig.state().house;
  rig.restart();
  expect(rig.state().house).toEqual(before);
});

it("un titular ausente no presta adaptadores; el administrador puede deshabilitarlo después", () => {
  const rig = open();
  enable(rig);
  expect(holds([desk], rig.state().house, actor, "desk")).toBe(true);
  expect(() => allowedAct(rig.state().house, actor, "desk", "say")).toThrow("registry");
  rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect(holds([desk], rig.state().house, actor, "desk")).toBe(false);
  rig.bus.emit(effect("assistant-disabled", { owner: "beto" }, "ana"));
  rig.bus.emit(effect("granted", { identity: "beto", tools: ["desk"] }, "ana"));
  expect(present([desk], rig.state().house, actor)).toBe(false);
});

it("nombra los argumentos ausentes antes de interpretar al asistente como no configurado", () => {
  const rig = open();
  expect(() => {
    Reflect.apply(assistantOfIdentity, undefined, [rig.state().house]);
  }).toThrow("owner");
  expect(() => {
    Reflect.apply(effectiveAssistantKit, undefined, [rig.state().house, "beto"]);
  }).toThrow("registry");
});
