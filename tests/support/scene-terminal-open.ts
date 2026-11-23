// A real terminal with optional scenes written through the house act, in a temporary test home.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { localPorts, startHouse } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { identitiesProgram, identitiesShown } from "./identities-program.ts";
const home = process.argv[2];
if (!home) throw new Error("A test home is required");
const house = startHouse(home, {
  ...identitiesProgram,
  by: "house",
  secretKeys: new MemoryHouseKeys(),
  creation: {
    admin: "ana",
    language: "es",
    assignments: [
      { identity: "beto", tools: [], language: "es" },
      { identity: "carla", tools: [], language: "es" },
    ],
  },
});
const seed = join(home, "scenes.json");
if (existsSync(seed)) {
  const scenes: unknown = JSON.parse(readFileSync(seed, "utf8"));
  if (!scenes || typeof scenes !== "object") throw new Error("Invalid test scenes");
  for (const by of Object.keys(scenes)) {
    const input: unknown = Reflect.get(scenes, by);
    const result = house.tools.act({ act: "scene", input }, house.tools.state().through, by);
    if (result.status !== "accepted") throw new Error(`Scene refused: ${result.reason}`);
  }
}
const router = houseRouter(localPorts(house, process.argv[3] ?? "beto", { recentLines: 40 }), identitiesShown);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
