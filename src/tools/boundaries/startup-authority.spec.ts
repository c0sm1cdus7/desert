import { emitUnchecked } from "../../../tests/support/startup-forge.ts";
// Revisor: desde el bus del arranque de una herramienta, emitir a mano hechos de la casa y del programa.
// Corre igual en f81e988 (antes) y en 7ccaab1 (después): la herramienta captura su ToolStartup sin usar act.
import { afterEach, expect, it } from "vitest";

import { effect, houseCatalog, type HouseEmission } from "../../journal/events.ts";
import { allowedAct } from "../../house/house.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shop, shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import type { Tool } from "../../tools/tool-contract.ts";
import type { ToolStartup } from "../../tools/startup-contract.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
function opened() {
  let startup: ToolStartup<Shop> | undefined;
  const desk: Tool<Shop> = {
    id: "desk",
    purpose: "Revisor",
    targets: () => ["desk/page"],
    summary: () => "",
    view: () => "",
    acts: {},
    start: ports => {
      startup = ports;
      return () => {};
    },
  };
  const rig = shopRig({
    registry: [...shopRegistry, desk],
    grants: { ana: ["sales", "payments", "desk"], beto: ["sales"] },
  });
  rigs.push(rig);
  if (!startup) throw new Error("no startup");
  return { rig, bus: startup.bus };
}
type Case = Readonly<{
  name: string;
  fact: HouseEmission | ReturnType<typeof shop.fact>;
  check: (rig: ReturnType<typeof shopRig>) => unknown;
}>;
const house = (rig: ReturnType<typeof shopRig>) => rig.state().house;
const cases: Case[] = [
  {
    name: "kit-set a nombre del admin: la mente se da todo el kit",
    fact: effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"),
    check: rig => ({
      kit: house(rig).kits.get("mind:desk")?.get("desk"),
      mayAct: allowedAct(house(rig), "mind:desk", "desk", "x"),
    }),
  },
  {
    name: "kit-set a nombre propio (mind:desk)",
    fact: effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "mind:desk"),
    check: rig => ({ kit: house(rig).kits.get("mind:desk")?.get("desk") ?? "sin kit" }),
  },
  {
    name: "kit-set a nombre del admin: le saca acciones a beto",
    fact: effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"),
    check: rig => ({ betoKitSales: house(rig).kits.get("beto")?.get("sales") }),
  },
  {
    name: "granted a nombre del admin: mete a eve con todo",
    fact: effect("granted", { identity: "eve", tools: ["sales", "payments", "desk"] }, "ana"),
    check: rig => ({ eve: house(rig).grants.get("eve") }),
  },
  {
    name: "removed a nombre del admin: saca a beto",
    fact: effect("removed", { identity: "beto" }, "ana"),
    check: rig => ({ betoIn: house(rig).grants.has("beto") }),
  },
  {
    name: "handed a nombre del admin: pasa la administración a beto",
    fact: effect("handed", { to: "beto" }, "ana"),
    check: rig => ({ admin: house(rig).admin }),
  },
  {
    name: "scene a nombre de la identidad ana",
    fact: effect("scene", { general: "FALSA de ana" }, "ana"),
    check: rig => ({ anaScene: house(rig).scenes.get("ana")?.data }),
  },
  {
    name: "scene a nombre de otra mente (mind:sales)",
    fact: effect("scene", { general: "FALSA de mind:sales" }, "mind:sales"),
    check: rig => ({ mindSalesScene: house(rig).scenes.get("mind:sales")?.data }),
  },
  {
    name: "house-created a nombre de eve",
    fact: effect("house-created", {}, "eve"),
    check: rig => ({ admin: house(rig).admin }),
  },
  {
    name: "wake-at para el recordatorio de otra (identidad ana)",
    fact: effect("wake-at", { id: 'attention:["ana","sales"]', at: 0 }, "ana"),
    check: rig => ({ wakeAtBy: rig.facts().at(-1)?.by }),
  },
  {
    name: "woke falsificado para otra mente (zero:other)",
    fact: effect("woke", { id: "zero:other" }, "shop"),
    check: rig => ({
      last: rig
        .facts()
        .filter(e => e.kind === "woke")
        .map(e => e.by),
    }),
  },
  {
    name: "preferred a nombre de ana",
    fact: effect("preferred", { hide: "off", on: true }, "ana"),
    check: rig => ({ anaHides: house(rig).hides.get("ana") }),
  },
  {
    name: "tool-entry a nombre de ana (autora ana) en sales",
    fact: effect("tool-entry", { tool: "sales", target: "sales", author: "ana", text: "FALSO de ana" }, "ana"),
    check: rig => ({ entries: rig.state().entries.filter(e => e.data.text === "FALSO de ana").length }),
  },
  {
    name: "hecho del programa a nombre de ana",
    fact: shop.fact("sale-registered", { sale: "falsa", total: 999 }, "ana"),
    check: rig => ({ sale: rig.state().tools.sales.get("falsa") }),
  },
];
for (const c of cases)
  it(`forja: ${c.name}`, () => {
    const { rig, bus } = opened();
    const before = rig.facts().length;
    expect(() => emitUnchecked(bus, c.fact)).toThrow(/act/);
    expect(rig.facts()).toHaveLength(before);
  });

for (const kind of Object.keys(houseCatalog).filter(kind => kind !== "wake-at"))
  it(`all house facts including ${kind} are forbidden even with the mind author`, () => {
    const { rig, bus } = opened();
    const before = rig.facts();
    expect(() => emitUnchecked(bus, { layer: "house", kind, by: "mind:desk", data: {}, cause: [] })).toThrow(/act/);
    expect(rig.facts()).toEqual(before);
  });

it("a program-layer wake cannot be laundered into a house wake", () => {
  const { rig, bus } = opened();
  const before = rig.facts();
  expect(() => emitUnchecked(bus, { layer: "program", kind: "wake-at", data: { id: "desk:x", at: null } })).toThrow(
    /act/,
  );
  expect(rig.facts()).toEqual(before);
});
