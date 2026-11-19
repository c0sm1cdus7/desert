// Drives rule authoring through the real terminal while allowing a synthetic authority change.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { localPorts, startHouse } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { effect } from "../../src/house/facts.ts";
import { settle } from "../../src/surface/bridge/ports/house-ports.ts";
import { shopProgram, shopShown } from "./shop.ts";
const [home, by = "ana"] = process.argv.slice(2);
if (!home) throw new Error("Missing test directory");
const options = {
  ...shopProgram,
  by: "shop",
  secretKeys: new MemoryHouseKeys(),
  creation: {
    admin: "ana",
    assignments: ["ana", "beto"].map(identity => ({ identity, tools: ["sales", "payments"] })),
  },
};
let house = startHouse(home, options);
house.bus.emit(
  effect(
    "rule-versioned",
    {
      version: 1,
      previous: null,
      definition: {
        id: "terminal-rule",
        text: "Tope anterior",
        action: { tool: "sales", act: "register" },
        condition: { operator: "actor", kind: "identity" },
        effect: "block",
      },
    },
    "ana",
  ),
);
const timer = setInterval(() => {
  if (existsSync(join(home, "promote")) && house.tools.state().house.admin !== "beto")
    house.bus.emit(effect("handed", { to: "beto" }, "ana"));
}, 20);
const router = houseRouter(localPorts(house, by, { recentLines: 20 }), shopShown);
await startTerminal(process.stdout, process.stdin, router);
clearInterval(timer);
router.stop();
house.close();
house = startHouse(home, options);
await settle(house.tools.act({ act: "attend", input: { target: "sales" } }, house.tools.state().through, by));
const sale = await settle(
  house.tools.act(
    { act: "register", target: "sales", input: { sale: "s1", total: 1500 } },
    house.tools.state().through,
    by,
  ),
);
writeFileSync(
  join(home, "result.json"),
  JSON.stringify({
    active: house.tools.state().house.rules.active.get("terminal-rule"),
    versions: house.tools.state().house.rules.versions.get("terminal-rule"),
    sale: sale.status,
  }),
);
house.close();
