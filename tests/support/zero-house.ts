import "./fixture-vault.ts";
import { afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startHouse } from "../../src/programs/house-runtime.ts";
import { shop, shopRegistry, type ShopEvent } from "./shop.ts";
import { zeroMind, zeroSlices } from "./zero-mind.ts";
import { effect } from "../../src/journal/events.ts";
const homes: string[] = [],
  houses: { close(): void }[] = [];
afterEach(() => {
  houses.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
export function zeroHouse(mind = zeroMind()) {
  const home = mkdtempSync(join(tmpdir(), "zero-mind-"));
  homes.push(home);
  const options = {
    by: "shop",
    projectionVersion: "zero/1",
    words: shop,
    slices: zeroSlices,
    registry: [...shopRegistry, mind.tool],
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments", mind.tool.id] }] },
  };
  let house = startHouse(home, options);
  houses.push(house);
  return {
    mind,
    house: () => house,
    kit: (acts: string[] | null) =>
      house.bus.emit(
        effect(
          "kit-set",
          {
            holder: `mind:${mind.tool.id}`,
            tool: mind.tool.id,
            acts,
          },
          "ana",
        ),
      ),
    facts: () => house.journal.replay<ShopEvent[]>([], (all, event) => [...all, event]),
    restart: () => {
      house.close();
      house = startHouse(home, options);
      houses.push(house);
    },
  };
}
