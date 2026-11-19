import { afterEach, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shopProgram } from "../../../tests/support/shop.ts";
import { startCloudHouse } from "../../runtime/cloud-house.ts";
import { environmentDoorKeys } from "../socket/peers/environment-door-keys.ts";
import { mcpDoor } from "./mcp-handler.ts";
const homes: string[] = [],
  stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach(stop => stop());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
it("serves the MCP door from a cloud house opened with its root key and door keys from the environment", async () => {
  const home = mkdtempSync(join(tmpdir(), "mcp-cloud-"));
  homes.push(home);
  const environment = { ROOT: Buffer.alloc(32, 7).toString("hex"), ANA: Buffer.alloc(32, 9).toString("hex") };
  const before = process.listeners("SIGTERM");
  const creation = { admin: "ana", assignments: [{ identity: "ana", tools: ["sales"] }] };
  const cloud = startCloudHouse({ ...shopProgram, by: "shop", creation }, home, environment, "ROOT");
  const signal = process.listeners("SIGTERM").find(listener => !before.includes(listener));
  if (signal) stops.push(() => signal("SIGTERM"));
  const keys = environmentDoorKeys(environment, [{ variable: "ANA", identity: "ana", door: "agent" }]);
  const door = mcpDoor(cloud.door, keys, { name: "Almacén", version: "1", limits: { recentLines: 20 } });
  const call = (name: string, args: unknown) =>
    door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: `Bearer ${environment.ANA}`, "content-type": "application/json" },
      body: () => [
        Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })),
      ],
    });
  const acted = await call("actuar", { programa: "sales", accion: "register", datos: { sale: "nube", total: 100 } });
  expect(JSON.parse(acted.body)).toMatchObject({
    result: { isError: false, content: [{ text: "Registrada · nube" }] },
  });
  const read = await call("leer", { programa: "sales" });
  expect(read.body).toContain("nube");
  await door.close();
});
