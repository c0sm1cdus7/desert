// Exercises distribution exports from a linked package using only synthetic custody and door keys.
export const distributionEntryFixture = `
import assert from "node:assert/strict";
import { join } from "node:path";
import { program as toy } from "toy";
import { compose } from "desert/compose";
import { startHouse, localPorts } from "desert/runtime";
import { MemoryHouseKeys } from "desert/testing";
import { houseRouter } from "desert/surface/house-router";
import { startCloudHouse } from "desert/runtime/cloud";
import { environmentDoorKeys } from "desert/doors/keys";
import { mcpDoor } from "desert/doors/mcp/handler";
import { serveMcp } from "desert/doors/mcp";

const { program, shown } = compose({ programs: [toy], identities: true,
  minds: { assistants: false, programs: [] }, shown: { code: [import.meta.filename],
  locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" } } });
const options = { ...program, by: "fixture",
  creation: { admin: "ana", language: "es" as const,
    assignments: [{ identity: "ana", tools: ["toy"], language: "es" as const }] } };
const limits = { recentLines: 20 };
const keys = new MemoryHouseKeys();
const localHome = join(import.meta.dirname, "local");
const local = startHouse(localHome, { ...options, secretKeys: keys });
const router = houseRouter(localPorts(local, "ana", limits), shown);
try {
  assert.equal(local.tools.state().house.admin, "ana");
  assert.ok(JSON.stringify(router.screen({ rows: 30 })).includes("Juguete"));
  await router.idle();
} finally {
  router.stop();
  local.close();
}
const reopened = startHouse(localHome, { ...options, secretKeys: keys });
assert.equal(reopened.tools.state().house.admin, "ana");
reopened.close();

const environment = { ROOT: Buffer.alloc(32, 71).toString("hex"), DOOR: Buffer.alloc(32, 72).toString("hex") };
const declaration = [{ variable: "DOOR", identity: "ana", door: "agent" }] as const;
const doorKeys = environmentDoorKeys(environment, declaration);
assert.equal(doorKeys.size, 1);
assert.throws(() => environmentDoorKeys({}, declaration));
assert.throws(() => environmentDoorKeys(environment, [...declaration, ...declaration]));
const cloudHome = join(import.meta.dirname, "cloud");
assert.throws(() => startCloudHouse(options, cloudHome, {}, "ROOT"));
const cloud = startCloudHouse(options, cloudHome, environment, "ROOT");
assert.equal("close" in cloud.door, false);
assert.equal(cloud.ports("ana", limits).state().house.admin, "ana");
const firstSequence = cloud.door.tools.state().through;
const door = mcpDoor(cloud.door, doorKeys, { name: "fixture", version: "1.0.0", limits });
// Typechecks compatibility with the HTTP adapter without opening a socket.
const httpDoor: Parameters<typeof serveMcp>[0] = door;
const request = (authorization: string) => ({ method: "POST", path: "/mcp",
  headers: { authorization, "content-type": "application/json" },
  body: () => [Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }))] });
try {
  const accepted = await httpDoor.handle(request("Bearer " + environment.DOOR));
  assert.equal(accepted.status, 200);
  assert.deepEqual(JSON.parse(accepted.body), { jsonrpc: "2.0", id: 1, result: {} });
  assert.equal(accepted.body.includes(environment.ROOT), false);
  assert.equal(accepted.body.includes(environment.DOOR), false);
  assert.equal((await door.handle(request("Bearer invalid"))).status, 401);
} finally {
  await httpDoor.close();
  process.emit("SIGTERM");
}
const resumed = startCloudHouse(options, cloudHome, environment, "ROOT");
assert.equal(resumed.ports("ana", limits).state().house.admin, "ana");
assert.ok(resumed.door.tools.state().through > firstSequence);
process.emit("SIGTERM");
assert.equal(process.listenerCount("SIGTERM"), 0);
process.stdout.write("local-cloud-exports-ok");
`;
