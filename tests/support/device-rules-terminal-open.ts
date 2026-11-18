// A real terminal chooses a synthetic device before the common mechanical guard runs.
import { generateKeyPairSync } from "node:crypto";
import { createDeviceProcess } from "../../src/doors/devices/device-process.ts";
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
const register = shopProgram.registry[0]?.acts.register;
if (!register) throw new Error("Missing register action");
Object.assign(register, { execution: { at: "device", tool: "sales", version: "1" } });
let dispatched = 0;
const house = startHouse(home, {
  ...shopProgram,
  by: "shop",
  secretKeys: new MemoryHouseKeys(),
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
});
const publicKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).toString("base64");
house.devices.register("ana", { id: "mac", name: "Mac de prueba", publicKey });
house.devices.accept("ana", "mac");
house.devices.connect(
  "mac",
  createDeviceProcess([
    {
      tool: "sales",
      version: "1",
      actions: {
        register: request => {
          dispatched++;
          return Promise.resolve({ status: "accepted", reference: request.execution });
        },
      },
    },
  ]),
);
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
        effect: "frena",
      },
    },
    "ana",
  ),
);
const ports = localPorts(house, "ana", { recentLines: 20 });
const router = houseRouter(ports, shopShown);
await startTerminal(process.stdout, process.stdin, router);
writeFileSync(
  join(home, "result.json"),
  JSON.stringify({
    sales: house.tools.state().tools.sales.size,
    dispatched,
    executions: house.tools.state().house.devices.executions.size,
    destination: house.journal.replay<unknown>(null, (last, event) =>
      event.kind === "act" && event.data.option === "register" ? event.data.destination : last,
    ),
    reason: house.journal.replay<string>("", (last, event) => (event.kind === "act-result" ? event.data.reason : last)),
    result: house.journal.replay<string>("", (result, event) =>
      event.kind === "act-result" ? event.data.status : result,
    ),
  }),
);
router.stop();
house.close();
