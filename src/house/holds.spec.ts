import { expect, it } from "vitest";
import { emptyHouse } from "./members.ts";
import { holds } from "./kit.ts";
const registry = [{ id: "vault" }, { id: "sales" }];
const house = {
  ...emptyHouse,
  admin: "ana",
  grants: new Map<string, readonly string[]>([
    ["ana", ["sales"]],
    ["beto", ["vault"]],
    ["mind:old", ["vault"]],
  ]),
  kits: new Map([["beto", new Map([["vault", []]])]]),
};
it("H2: a mind holds only its own tool's adapters", () => {
  expect(holds(registry, house, "mind:vault", "vault")).toBe(true);
  expect(holds(registry, house, "mind:vault", "sales")).toBe(false);
  expect(holds(registry, house, "mind:old", "vault")).toBe(false);
});
it("H3: a mind whose tool is absent holds no adapters", () => {
  expect(holds(registry, house, "mind:gone", "gone")).toBe(false);
  expect(holds(registry, house, "mind:", "vault")).toBe(false);
});
it("H1: an identity holds its granted tool, never an ungranted tool or after leaving", () => {
  expect(holds(registry, house, "beto", "vault")).toBe(true);
  expect(holds(registry, house, "beto", "sales")).toBe(false);
  expect(holds(registry, house, "carla", "vault")).toBe(false);
});
it("H5: being present, even administering, does not grant adapters", () => {
  expect(holds(registry, house, "ana", "vault")).toBe(false);
  expect(holds(registry, house, "ana", "sales")).toBe(true);
});
