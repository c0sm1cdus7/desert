// The HTTP door over the in-memory shop; every credential is generated for one test.
import { randomUUID } from "node:crypto";
import { shopRig } from "./shop-rig.ts";
import { shopRegistry } from "./shop.ts";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import type { DoorKey } from "../../src/doors/socket/peers/socket-peer.ts";
export function mcpHouse(registry = shopRegistry) {
  const rig = shopRig({ registry, grants: { ana: ["sales", "payments"], beto: ["sales"], carla: [] } });
  const keys = new Map<string, DoorKey>();
  const key = (identity: string, door: DoorKey["door"] = "agente") => {
    const value = randomUUID();
    keys.set(value, { identity, door });
    return value;
  };
  const ana = key("ana");
  const beto = key("beto");
  const carla = key("carla");

  const house = { tools: rig.tools(), registry, bus: rig.bus, journal: rig.journal, now: Date.now };
  const door = mcpDoor(house, keys, { name: "Almacén", version: "1", limits: { recentLines: 20 } });
  const request = (value: unknown, token = ana) =>
    door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: () => [Buffer.from(JSON.stringify(value))],
    });
  const call = (name: string, args: unknown = {}, token = ana) =>
    request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, token);
  return {
    rig,
    house,
    door,
    keys,
    key,
    ana,
    beto,
    carla,
    terminal: key("ana", "terminal"),
    request,
    call,
    close: async () => {
      await door.close();
      rig.close();
    },
  };
}
