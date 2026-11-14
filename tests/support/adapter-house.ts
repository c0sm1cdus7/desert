import "./fixture-vault.ts";
import { afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryHouseKeys } from "../../src/adapters/secrets/custody/house-keys.ts";
import { adapterProgram } from "./declared-adapters.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "./shop.ts";
import type { Tool } from "../../src/tools/tool-contract.ts";
import { startHouse } from "../../src/programs/house-runtime.ts";
const homes: string[] = [],
  houses: { close(): void }[] = [];
afterEach(() => {
  houses.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
export function adapterHouse(
  acts: Tool<Shop>["acts"],
  extra: Partial<Tool<Shop>> = {},
  adapters = adapterProgram.adapters,
) {
  const path = mkdtempSync(join(tmpdir(), "declared-house-"));
  homes.push(path);
  const options = optionsFor(acts, extra, adapters);
  let house = startHouse(path, options);
  houses.push(house);
  const act = async (name: string, target = "vault") => {
    house.tools.act({ act: "attend", input: { target } }, 0, "ana");
    const result = house.tools.act({ act: name, target, input: {} }, 0, "ana");
    return result.status === "processing" ? result.completion : result;
  };
  return {
    path,
    options,
    act,
    facts: () => house.journal.replay<unknown[]>([], (events, event) => [...events, event]),
    restart: () => {
      house.close();
      house = startHouse(path, options);
      houses.push(house);
    },
    close: () => house.close(),
    bus: () => house.bus,
    journal: () => house.journal,
  };
}
function optionsFor(acts: Tool<Shop>["acts"], extra: Partial<Tool<Shop>>, adapters = adapterProgram.adapters) {
  const vault: Tool<Shop> = {
    id: "vault",
    purpose: "Prueba sintética",
    targets: () => ["child"],
    summary: () => "",
    view: () => "",
    acts,
    ...extra,
  };
  return {
    by: "ana",
    projectionVersion: "adapters/1",
    words: shop,
    slices: shopSlices,
    registry: [...shopRegistry, vault],
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments", "vault"] }] },
    ...adapterProgram,
    ...(adapters ? { adapters } : {}),
    secretKeys: new MemoryHouseKeys(),
  };
}
