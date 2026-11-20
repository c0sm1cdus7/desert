// The house side of the HTTP device door, spoken by hand over a real loopback listener.
import { expect, it } from "vitest";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { deviceHttpHouse } from "../../../tests/support/device-http-house.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { isRecord } from "../../fields/json-values.ts";
import { deviceHttpLimits, devicePaths } from "./device-wire.ts";
const inventory = [{ tool: "shell", version: "1", actions: ["run"] }];
type Rig = Awaited<ReturnType<typeof deviceHttpHouse>>;
async function challenge(h: Rig, device: string) {
  const answer = await h.post(devicePaths.challenge, { device });
  expect(answer.status).toBe(200);
  const value = answer.json();
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.message !== "string")
    throw new Error("Missing challenge");
  return { id: value.id, message: value.message };
}
async function connect(h: Rig, device: string, signer: (message: string) => string) {
  const { id, message } = await challenge(h, device);
  const answer = await h.post(devicePaths.connect, { id, signature: signer(message), inventory });
  expect(answer.status).toBe(200);
  const value = answer.json();
  if (!isRecord(value) || typeof value.session !== "string") throw new Error("Missing session");
  return value.session;
}
async function poll(h: Rig, token: string, results: unknown[] = []) {
  const answer = await h.post(devicePaths.poll, { results }, token);
  if (answer.status !== 200) return { status: answer.status, requests: [] };
  const value = answer.json();
  if (!isRecord(value) || !Array.isArray(value.requests)) throw new Error("Missing requests");
  return { status: answer.status, requests: value.requests.filter(isRecord) };
}
const unknownExecutions = (h: Rig) =>
  [...h.house().tools.state().house.devices.executions.values()].filter(each => each.status === "unknown").length;

it("dispatches an action to an HTTP device and returns its receipt, ignoring unknown and repeated calls", async () => {
  const observed: unknown[][] = [];
  const h = await deviceHttpHouse({
    observe: (device, request, result) => {
      const status = h.house().tools.state().house.devices.executions.get(request.execution)?.status;
      observed.push([device, request.action, result.reference, status]);
      throw new Error("an observer failure stays outside the receipt");
    },
  });
  const token = await connect(h, "mac", h.provision("mac"));
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(h.connection("mac")).toBeDefined();
  const pending = settle(h.act("mac"));
  const { requests } = await poll(h, token);
  expect(requests).toHaveLength(1);
  const [first] = requests;
  if (!first || typeof first.call !== "string" || !isRecord(first.request)) throw new Error("Missing call");
  expect(first.request.device).toBe("mac");
  const receipt = { status: "accepted", reference: "receipt:1", value: "remote" };
  const later = { status: "rejected", reference: "receipt:2", reason: "tarde" };
  expect(
    (
      await poll(h, token, [
        { call: "forged", result: receipt },
        { call: first.call, result: receipt },
      ])
    ).status,
  ).toBe(200);
  expect(await pending).toMatchObject({ status: "accepted", value: "remote" });
  expect((await poll(h, token, [{ call: first.call, result: later }])).status).toBe(200);
  const executions = [...h.house().tools.state().house.devices.executions.values()];
  expect(executions.map(each => [each.status, each.reference])).toEqual([["accepted", "receipt:1"]]);
  expect(observed).toEqual([["mac", "run", "receipt:1", "running"]]);
  expect(h.rig.house.journal.replay<string>("", (all, event) => all + JSON.stringify(event))).not.toContain(token);
});
it("rejects a wrong signature, consumes the challenge and rejects it once expired", async () => {
  const h = await deviceHttpHouse();
  const signer = h.provision("mac");
  const { privateKey } = generateKeyPairSync("ed25519");
  const stranger = (message: string) => sign(null, Buffer.from(message), privateKey).toString("base64");
  const issued = await challenge(h, "mac");
  const wrong = await h.post(devicePaths.connect, { id: issued.id, signature: stranger(issued.message), inventory });
  expect(wrong).toMatchObject({ status: 401, text: "" });
  const reused = await h.post(devicePaths.connect, { id: issued.id, signature: signer(issued.message), inventory });
  expect(reused.status).toBe(401);
  const expiring = await challenge(h, "mac");
  h.advance(30_000);
  const late = await h.post(devicePaths.connect, { id: expiring.id, signature: signer(expiring.message), inventory });
  expect(late.status).toBe(401);
  expect((await h.post(devicePaths.challenge, { device: "nobody" })).status).toBe(401);
  expect(h.connection("mac")).toBeUndefined();
  await connect(h, "mac", signer);
  expect(h.connection("mac")).toBeDefined();
});
it("refuses forged, stolen and replaced session tokens", async () => {
  const h = await deviceHttpHouse();
  const signer = h.provision("mac");
  const first = await connect(h, "mac", signer);
  expect((await poll(h, randomBytes(32).toString("base64url"))).status).toBe(401);
  expect((await poll(h, `${first.slice(0, -1)}${first.endsWith("A") ? "B" : "A"}`)).status).toBe(401);
  expect((await h.post(devicePaths.poll, { results: [] })).status).toBe(401);
  const pending = settle(h.act("mac"));
  const second = await connect(h, "mac", signer);
  expect(await pending).toMatchObject({ status: "inconclusive" });
  expect((await poll(h, first)).status).toBe(401);
  expect((await poll(h, second)).status).toBe(200);
});
it("disconnects a session that stops polling and leaves its pending execution unknown", async () => {
  const h = await deviceHttpHouse();
  const token = await connect(h, "mac", h.provision("mac"));
  const pending = settle(h.act("mac"));
  h.advance(deviceHttpLimits.idleMs - 1);
  expect((await h.post(devicePaths.challenge, { device: "nobody" })).status).toBe(401);
  expect(h.connection("mac")).toBeDefined();
  h.advance(1);
  expect((await h.post(devicePaths.challenge, { device: "nobody" })).status).toBe(401);
  expect(await pending).toMatchObject({ status: "inconclusive" });
  expect(unknownExecutions(h)).toBe(1);
  expect(h.connection("mac")).toBeUndefined();
  expect((await poll(h, token)).status).toBe(401);
});
it("cuts off a retired device at once, its waiting poll included", async () => {
  const h = await deviceHttpHouse({ pollMs: 4_000 });
  const token = await connect(h, "mac", h.provision("mac"));
  const pending = settle(h.act("mac"));
  const waiting = poll(h, token);
  expect((await waiting).requests).toHaveLength(1);
  const idle = poll(h, token);
  await new Promise(resolve => setTimeout(resolve, 50));
  h.house().devices.retire("beto", "mac");
  expect((await idle).status).toBe(401);
  expect(await pending).toMatchObject({ status: "inconclusive" });
  expect((await h.post(devicePaths.challenge, { device: "mac" })).status).toBe(401);
});
it("bounds bodies and rejects malformed requests without detail", async () => {
  const h = await deviceHttpHouse();
  const token = await connect(h, "mac", h.provision("mac"));
  const huge = JSON.stringify({ device: "x".repeat(deviceHttpLimits.body) });
  expect((await h.post(devicePaths.challenge, huge)).status).toBe(413);
  expect(
    (await h.post(devicePaths.poll, { results: [], padding: "x".repeat(deviceHttpLimits.body) }, token)).status,
  ).toBe(413);
  const tooMany = Array.from({ length: deviceHttpLimits.results + 1 }, (_, call) => ({
    call: `${call}`,
    failed: true,
  }));
  for (const [path, body] of [
    [devicePaths.challenge, "{"],
    [devicePaths.challenge, { device: "mac", extra: 1 }],
    [devicePaths.connect, { id: "x", signature: "y", inventory: [{ tool: "shell" }] }],
    [devicePaths.poll, { results: tooMany }],
    [devicePaths.poll, { results: [{ call: "x", result: 1, failed: true }] }],
  ] as const) {
    const answer = await h.post(path, body, token);
    expect(answer).toMatchObject({ status: 400, text: "" });
  }
  const wrongType = await fetch(`${h.url()}${devicePaths.challenge}`, { method: "POST", body: "{}" });
  expect(wrongType.status).toBe(415);
  expect((await fetch(`${h.url()}${devicePaths.poll}`)).status).toBe(405);
  expect((await h.post("/door/device/other", {})).status).toBe(404);
  expect(h.connection("mac")).toBeDefined();
});
it("bounds outstanding challenges per device", async () => {
  const h = await deviceHttpHouse();
  h.provision("mac");
  for (let index = 0; index < deviceHttpLimits.challenges; index++) await challenge(h, "mac");
  expect((await h.post(devicePaths.challenge, { device: "mac" })).status).toBe(429);
  h.advance(30_000);
  await challenge(h, "mac");
});
