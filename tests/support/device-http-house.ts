// A device-enabled house door on a real loopback listener, with a clock the test moves and restartable storage.
import { afterEach } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { setup } from "./device-house.ts";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import { serveMcp } from "../../src/doors/mcp/mcp-http.ts";
import type { NoticeObserver, Observer } from "../../src/doors/devices/device-sessions.ts";
import type { ActionExecution } from "../../src/fields/device-protocol.ts";
type House = ReturnType<typeof setup>["house"];
type Timing = Readonly<{
  idleMs?: number;
  pollMs?: number;
  observe?: Observer;
  observeNotice?: NoticeObserver;
  execution?: ActionExecution;
}>;
const cleanups: (() => unknown)[] = [];
afterEach(async () => {
  for (const stop of cleanups.splice(0).reverse()) await stop();
});
export function onCleanup(stop: () => unknown) {
  cleanups.push(stop);
}
function listener(timing: Timing, now: () => number) {
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  let port = 0;
  const devices = (house: House) => ({
    access: house.devices,
    now,
    idleMs: timing.idleMs ?? 60_000,
    pollMs: timing.pollMs ?? 100,
    ...(timing.observe ? { observe: timing.observe } : {}),
    ...(timing.observeNotice ? { observeNotice: timing.observeNotice } : {}),
  });
  return {
    url: () => `http://127.0.0.1:${port}`,
    async listen(house: House) {
      const door = mcpDoor(house, { name: "Test", version: "1", limits: { recentLines: 20 }, devices: devices(house) });
      server = await serveMcp(door, { host: "127.0.0.1", port });
      const address = server.address;
      if (!address || typeof address === "string") throw new Error("Missing TCP address");
      port = address.port;
    },
    async stop() {
      await server?.close();
      server = undefined;
    },
  };
}
function client(url: () => string) {
  return async (path: string, body: unknown, token?: string) => {
    const response = await fetch(`${url()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, text, json: (): unknown => JSON.parse(text) };
  };
}
/** Registers and accepts a device through the owner's identity actions, as any surface would. */
function provisioner(house: () => House) {
  return (id: string) => {
    const pair = generateKeyPairSync("ed25519");
    const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
    house().devices.register("beto", { id, name: id, publicKey });
    house().devices.accept("beto", id);
    return (message: string) => sign(null, Buffer.from(message), pair.privateKey).toString("base64");
  };
}
export async function deviceHttpHouse(timing: Timing = {}) {
  const rig = setup(timing.execution);
  let house = rig.house;
  let at = 1_000_000;
  const net = listener(timing, () => at);
  onCleanup(() => net.stop());
  await net.listen(house);
  return {
    rig,
    house: () => house,
    url: net.url,
    advance: (milliseconds: number) => {
      at += milliseconds;
    },
    post: client(net.url),
    provision: provisioner(() => house),
    act: (device: string) =>
      house.tools.act(
        { act: "run", target: "agents", input: { command: "test" }, destination: { kind: "device", device } },
        0,
        "beto",
      ),
    connection: (device: string) => house.tools.state().house.devices.devices.get(device)?.connection,
    restart: async () => {
      await net.stop();
      house.close();
      house = rig.open();
      await net.listen(house);
    },
  };
}
