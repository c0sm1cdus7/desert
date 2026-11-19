import { effect } from "../../house/facts.ts";
import { findDoorKey } from "../../house/doors/door-material.ts";
import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { salesTool, paymentsTool } from "../../../tests/support/shop.ts";
import { mcpDoor } from "./mcp-handler.ts";
import { socketLimits } from "../socket/wire/protocol.ts";
const opened: ReturnType<typeof mcpHouse>[] = [];
const setup = (registry = [salesTool, paymentsTool]) => {
  const h = mcpHouse(registry);
  opened.push(h);
  return h;
};
afterEach(async () => {
  vi.useRealTimers();
  for (const h of opened.splice(0)) await h.close();
});
it("shows unavailable actions and thing actions even before any things exist", async () => {
  const register = salesTool.acts.register;
  if (!register) throw new Error("Missing fixture action");
  const h = setup([
    {
      ...salesTool,
      acts: {
        register: { ...register, refuses: ["Closed"], offered: () => "Closed" },
        modify: { ...register, on: "thing" },
      },
    },
    paymentsTool,
  ]);
  const before = await h.call("actions", { program: "sales" });
  expect(before.body).toContain("Closed");
  expect(before.body).toContain("modify");
  expect(before.body).toContain("thing");
  const denied = await h.call("act", { program: "sales", action: "register", data: { sale: "x", total: 1 } });
  expect(JSON.parse(denied.body)).toMatchObject({ result: { isError: true } });
  expect(denied.body).toContain("Closed");
});
it("reads needs with the same per-identity filtering and removes terminal codes", async () => {
  const h = setup([
    {
      ...salesTool,
      view: () => "\u001b[31mVentas\u001b[0m",
      needs: () => [
        { target: "sales", why: "De Beto", to: "beto" },
        { target: "sales", why: "De Ana", to: "ana" },
      ],
    },
    paymentsTool,
  ]);
  const home = await h.call("read", {}, h.beto);
  expect(home.body).toContain("De Beto");
  expect(home.body).not.toContain("De Ana");
  const reading = await h.call("read", { program: "sales" }, h.beto);
  expect(JSON.parse(reading.body)).toMatchObject({ result: { content: [{ text: "Ventas" }] } });
});
it("rejects unknown targets and invalid tool arguments without exposing exceptions", async () => {
  const secret = randomUUID();
  const h = setup([
    {
      ...salesTool,
      view: () => {
        throw new Error(secret);
      },
    },
    paymentsTool,
  ]);
  const read = await h.call("read", { program: "sales" });
  expect(JSON.parse(read.body)).toMatchObject({ error: { code: -32603 } });
  expect(read.body.includes(secret)).toBe(false);
  for (const [name, args] of [
    ["wait", { since: -1, seconds: 0 }],
    ["wait", { since: 0, seconds: -1 }],
    ["act", { program: "sales", action: "register", data: [] }],
    ["sincronizar", {}],
    ["read", { program: "sales", extra: true }],
  ] as const) {
    expect(JSON.parse((await h.call(name, args)).body)).toMatchObject({ error: { code: -32602 } });
  }
  const call = await h.call("act", { program: "sales", action: "register", target: "absent", data: {} });
  expect(JSON.parse(call.body)).toMatchObject({ result: { isError: true } });
});
it("accepts exactly the byte bound, rejects broken UTF-8, and checks auth before size", async () => {
  const h = setup();
  const ping = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" });
  const headers = { authorization: `Bearer ${h.ana}`, "content-type": "application/json" };
  const request = { method: "POST", path: "/mcp", headers };
  const boundary = await h.door.handle({ ...request, body: () => [Buffer.from(ping.padEnd(socketLimits.json))] });
  expect(JSON.parse(boundary.body)).toMatchObject({ result: {} });
  const broken = await h.door.handle({ ...request, body: () => [Uint8Array.from([255])] });
  expect(JSON.parse(broken.body)).toMatchObject({ error: { code: -32700 } });
  const body = vi.fn(() => []);
  const unauthorized = await h.door.handle({
    ...request,
    headers: { "content-length": String(socketLimits.json + 1) },
    body,
  });
  expect(unauthorized.status).toBe(401);
  expect(body).not.toHaveBeenCalled();
});
it("releases a disconnected wait and leaves no timer or bus subscription", async () => {
  vi.useFakeTimers();
  const h = setup();
  const controller = new AbortController();
  const watch = vi.spyOn(h.house.bus, "on");
  const waiting = h.door.handle({
    method: "POST",
    path: "/mcp",
    signal: controller.signal,
    headers: { authorization: `Bearer ${h.ana}`, "content-type": "application/json" },
    body: () => [
      Buffer.from(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "wait", arguments: { since: h.rig.state().through, seconds: 60 } },
        }),
      ),
    ],
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(watch).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(1);
  controller.abort();
  await waiting;
  expect(vi.getTimerCount()).toBe(0);
});
it("requires explicit server metadata and reading limits", () => {
  const h = setup();
  expect(() => mcpDoor(h.house, h.keys, { name: "", version: "1", limits: { recentLines: 20 } })).toThrow();
  expect(() => mcpDoor(h.house, h.keys, { name: "x", version: "", limits: { recentLines: 20 } })).toThrow();
});
it("rechecks a revoked credential after a slow body, before reading the house", async () => {
  const h = setup();
  const response = await h.door.handle({
    method: "POST",
    path: "/mcp",
    headers: { authorization: `Bearer ${h.beto}`, "content-type": "application/json" },
    body: function* () {
      const key = findDoorKey(h.rig.state().house.doors, h.beto);
      if (!key) throw new Error("Missing fixture credential");
      h.rig.bus.emit(effect("door-key-revoked", { key: key.id }, "ana"));
      yield Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read" } }));
    },
  });
  expect(response.status).toBe(401);
  expect(response.body).toBe("");
});
