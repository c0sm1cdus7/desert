// The test shop on a real terminal, house and surface in one process: `node tests/support/shop-open.ts [home]`.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { localPorts, startHouse } from "../../src/programs/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/house-router.ts";
import { MemoryKeys } from "./shop-rig.ts";
import { shop, shopRegistry, shopSlices, shopWords, type Shop } from "./shop.ts";

const home = process.argv[2] ?? mkdtempSync(join(tmpdir(), "desert-shop-"));
const all = shopRegistry.map(tool => tool.id);
const house = startHouse<Shop>(home, {
  by: "shop",
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: all }] },
  keys: new MemoryKeys(),
  words: shop,
  registry: shopRegistry,
  slices: shopSlices,
});
const router = houseRouter(localPorts(house, "ana", { recentLines: 40 }), shopWords);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
