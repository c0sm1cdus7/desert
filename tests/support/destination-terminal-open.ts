// Exposes real destination forms with two synthetic endpoints and a controlled disconnection.
import { generateKeyPairSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createDeviceProcess } from "../../src/doors/devices/device-process.ts";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import type { ActionExecution } from "../../src/fields/device-protocol.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { localPorts, startHouse } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { shopProgram, shopShown } from "./shop.ts";
const [home, mode = "either"] = process.argv.slice(2);
if (!home) throw new Error("Missing test directory");
const at = mode === "house" || mode === "either" ? mode : "device";
const execution: ActionExecution = at === "house" ? { at } : { at, tool: "sales", version: "1" };
const registry = shopProgram.registry.map(tool =>
  tool.id === "sales"
    ? {
        ...tool,
        acts: Object.fromEntries(
          Object.entries(tool.acts).map(([name, act]) => [
            name,
            name === "register"
              ? {
                  ...act,
                  execution,
                }
              : act,
          ]),
        ),
      }
    : tool,
);
const house = startHouse(home, {
  ...shopProgram,
  identities: true,
  registry,
  by: "shop",
  secretKeys: new MemoryHouseKeys(),
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
});
const received: string[] = [];
const connections = new Map<string, { disconnect(): void }>();
for (const id of ["mac", "vm", "old"]) {
  const publicKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).toString("base64");
  house.devices.register("ana", { id, name: id, publicKey });
  house.devices.accept("ana", id);
  if (mode !== "none")
    connections.set(
      id,
      house.devices.connect(
        id,
        createDeviceProcess([
          {
            tool: "sales",
            version: id === "old" ? "0" : "1",
            actions: {
              register: request => {
                received.push(request.device);
                return Promise.resolve({ status: "accepted", reference: request.execution });
              },
            },
          },
        ]),
      ),
    );
}
const timer = setInterval(() => {
  if (existsSync(join(home, "disconnect"))) connections.get("mac")?.disconnect();
}, 20);
const router = houseRouter(localPorts(house, "ana", { recentLines: 20 }), shopShown);
await startTerminal(process.stdout, process.stdin, router);
clearInterval(timer);
router.stop();
writeFileSync(
  join(home, "result.json"),
  JSON.stringify({
    received,
    sales: house.tools.state().tools.sales.size,
    destinations: house.journal.replay<unknown[]>([], (all, event) =>
      event.kind === "act" && event.data.option === "register" ? [...all, event.data.destination] : all,
    ),
  }),
);
house.close();
