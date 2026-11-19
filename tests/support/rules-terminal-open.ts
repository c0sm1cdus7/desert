// Terminal de aceptación con diario temporal, una regla mecánica y ninguna credencial real.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { localPorts, startHouse } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { effect } from "../../src/house/facts.ts";
import { shopProgram, shopShown } from "./shop.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing test directory");
const house = startHouse(home, {
  ...shopProgram,
  by: "shop",
  secretKeys: new MemoryHouseKeys(),
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
});
house.bus.emit(
  effect(
    "rule-versioned",
    {
      version: 1,
      previous: null,
      definition: {
        id: "sales-limit",
        text: "Tope de ventas",
        action: { tool: "sales", act: "register" },
        condition: { operator: "gt", field: { source: "input", path: "total" }, value: 10 },
        effect: "block",
      },
    },
    "ana",
  ),
);
const router = houseRouter(localPorts(house, "ana", { recentLines: 20 }), shopShown);
await startTerminal(process.stdout, process.stdin, router);
writeFileSync(
  join(home, "result.json"),
  JSON.stringify({
    sales: house.tools.state().tools.sales.size,
    result: house.journal.replay<string>("", (result, event) =>
      event.kind === "act-result" ? event.data.status : result,
    ),
  }),
);
router.stop();
house.close();
