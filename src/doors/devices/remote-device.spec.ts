// The device client runs a real device process against a house door on a loopback listener.
import { expect, it, vi } from "vitest";
import { deviceHttpHouse, onCleanup } from "../../../tests/support/device-http-house.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import type { DeviceRequest, DeviceResult } from "../../fields/device-protocol.ts";
import { createDeviceProcess } from "./device-process.ts";
import { connectRemoteDevice } from "./remote-device.ts";
import { deviceHttpLimits, devicePaths } from "./device-wire.ts";
type Run = (request: DeviceRequest) => Promise<DeviceResult>;
function gate() {
  let resolve = () => {};
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
const receipt: Run = request =>
  Promise.resolve({ status: "accepted", reference: `result:${request.execution}`, value: "remote" });
function start(
  h: Awaited<ReturnType<typeof deviceHttpHouse>>,
  run: Run = receipt,
  send: typeof fetch = fetch,
  report?: (reason: string) => void,
) {
  const controller = new AbortController();
  const requests: DeviceRequest[] = [];
  const endpoint = createDeviceProcess([
    {
      tool: "shell",
      version: "1",
      actions: {
        run: request => {
          requests.push(request);
          return run(request);
        },
      },
    },
  ]);
  const running = connectRemoteDevice({
    url: h.url(),
    device: "mac",
    sign: h.provision("mac"),
    endpoint,
    fetch: send,
    signal: controller.signal,
    backoff: { first: 10, max: 40 },
    ...(report ? { report } : {}),
  });
  const stop = async () => {
    controller.abort();
    await running;
  };
  onCleanup(stop);
  return { requests, stop, running };
}
const connected = (h: Awaited<ReturnType<typeof deviceHttpHouse>>) =>
  vi.waitFor(() => expect(h.connection("mac")).toBeDefined(), { timeout: 3_000, interval: 10 });

it("connects over HTTP and returns concurrent results of a device action to the house", async () => {
  const h = await deviceHttpHouse();
  const release: (() => void)[] = [];
  const device = start(h, request => {
    const { promise, resolve } = gate();
    release.push(resolve);
    return promise.then(() => receipt(request));
  });
  await connected(h);
  const first = settle(h.act("mac"));
  const second = settle(h.act("mac"));
  await vi.waitFor(() => expect(release).toHaveLength(2), { timeout: 3_000, interval: 10 });
  release[1]?.();
  expect(await second).toMatchObject({ status: "accepted", value: "remote" });
  release[0]?.();
  expect(await first).toMatchObject({ status: "accepted", value: "remote" });
  expect(device.requests.map(each => each.action)).toEqual(["run", "run"]);
  await device.stop();
});
it("reports a failed device execution as unknown and keeps serving", async () => {
  const h = await deviceHttpHouse();
  let fail = true;
  start(h, request => (fail ? Promise.reject(new Error("broken")) : receipt(request)));
  await connected(h);
  expect(await settle(h.act("mac"))).toMatchObject({ status: "inconclusive" });
  fail = false;
  expect(await settle(h.act("mac"))).toMatchObject({ status: "accepted" });
});
it("ends a receipt that would fill the body to the byte unknown, and never lets it hold back the next", async () => {
  const h = await deviceHttpHouse();
  const filled: Run = request => {
    const result = { status: "accepted", reference: `result:${request.execution}`, value: "" } as const;
    const empty = Buffer.byteLength(JSON.stringify({ call: "0".repeat(36), result }));
    return Promise.resolve({ ...result, value: "x".repeat(deviceHttpLimits.body - deviceHttpLimits.envelope - empty) });
  };
  let big = true;
  start(h, request => (big ? filled(request) : receipt(request)));
  await connected(h);
  expect(await settle(h.act("mac"))).toMatchObject({ status: "inconclusive" });
  big = false;
  expect(await settle(h.act("mac"))).toMatchObject({ status: "accepted", value: "remote" });
});
it("reconnects after a dropped poll with a new session and says why the first one ended", async () => {
  const h = await deviceHttpHouse();
  let drop = 0;
  const sessions = new Set<string>();
  const send: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    const token = request.headers.get("authorization");
    if (token) sessions.add(token);
    if (request.url.endsWith(devicePaths.poll) && drop-- === 1) return Promise.reject(new TypeError("dropped"));
    return fetch(request);
  };
  const reasons: string[] = [];
  start(h, receipt, send, reason => reasons.push(reason));
  await vi.waitFor(() => expect(sessions.size).toBe(1), { timeout: 3_000, interval: 10 });
  const before = h.connection("mac");
  drop = 1;
  await vi.waitFor(() => expect(sessions.size).toBe(2), { timeout: 3_000, interval: 10 });
  expect(h.connection("mac")).not.toBe(before);
  expect(reasons).toEqual(["TypeError: dropped"]);
  expect(await settle(h.act("mac"))).toMatchObject({ status: "accepted" });
});
it("reconnects after the house restarts, leaving the interrupted execution unknown", async () => {
  const h = await deviceHttpHouse();
  const { promise: hold, resolve } = gate();
  let held = true;
  const device = start(h, request => (held ? hold.then(() => receipt(request)) : receipt(request)));
  await connected(h);
  const interrupted = settle(h.act("mac"));
  await vi.waitFor(() => expect(device.requests).toHaveLength(1), { timeout: 3_000, interval: 10 });
  await h.restart();
  expect(await interrupted).toMatchObject({ status: "inconclusive" });
  held = false;
  resolve();
  await connected(h);
  expect(await settle(h.act("mac"))).toMatchObject({ status: "accepted", value: "remote" });
  const statuses = [...h.house().tools.state().house.devices.executions.values()].map(each => each.status);
  expect(statuses).toEqual(["unknown", "accepted"]);
});
it("stops when its signal aborts and refuses an unencrypted remote address", async () => {
  const h = await deviceHttpHouse();
  const device = start(h);
  await connected(h);
  await device.stop();
  await expect(device.running).resolves.toBeUndefined();
  await expect(
    connectRemoteDevice({
      url: "http://house.example",
      device: "mac",
      sign: () => "",
      endpoint: createDeviceProcess([]),
    }),
  ).rejects.toThrow();
});
