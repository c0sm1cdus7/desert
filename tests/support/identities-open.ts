// The opt-in composition on a real terminal, with test-only in-memory custody.
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
    assignments: [{ identity: "beto", tools: [], language: "es" }],
  },
});
const router = houseRouter(localPorts(house, "ana", { recentLines: 40 }), identitiesShown);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
