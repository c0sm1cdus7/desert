import { mcpTexts } from "../../texts/mcp.texts.ts";
import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { socketLimits } from "../socket/wire/protocol.ts";
const opened: ReturnType<typeof mcpHouse>[] = [];
const setup = () => {
  const rig = mcpHouse();
  opened.push(rig);
  return rig;
};
afterEach(async () => {
  vi.useRealTimers();
  for (const rig of opened.splice(0)) await rig.close();
});
it.each(["missing", "wrong", "terminal", "short", "long", "absent", "mind"])(
  "denies %s credentials before reading the body",
  async kind => {
    const h = setup();
    const tokens: Record<string, string> = {
      wrong: randomUUID(),
      terminal: h.terminal,
      short: "a",
      long: randomUUID().repeat(3),
      absent: h.key("absent"),
      mind: h.key("mind:sales"),
    };
    const body = vi.fn(() => {
      throw new Error("Body must stay unread");
    });
    const headers = kind === "missing" ? {} : { authorization: `Bearer ${tokens[kind] ?? ""}` };
    const response = await h.door.handle({ method: "POST", path: "/mcp", headers, body });
    expect(response).toEqual({ status: 401, headers: { "WWW-Authenticate": "Bearer" }, body: "" });
    expect(body).not.toHaveBeenCalled();
  },
);
it("serves only the two routes, with a public and empty-of-house health response", async () => {
  const h = setup();
  const body = vi.fn(() => []);
  for (const [method, path, status] of [
    ["GET", "/salud", 200],
    ["GET", "/mcp", 405],
    ["PUT", "/mcp", 404],
    ["POST", "/salud", 404],
    ["GET", "/other", 404],
  ] as const) {
    const response = await h.door.handle({ method, path, headers: {}, body });
    expect(response.status).toBe(status);
    expect(response.body).toBe(status === 200 ? "ok" : "");
  }
  expect(body).not.toHaveBeenCalled();
});
it("checks declared size then type before consuming and bounds chunked bytes", async () => {
  const h = setup();
  const body = vi.fn(() => []);
  const base = { method: "POST", path: "/mcp", body };
  const headers = { authorization: `Bearer ${h.ana}` };
  expect(
    (await h.door.handle({ ...base, headers: { ...headers, "content-length": String(socketLimits.json + 1) } })).status,
  ).toBe(413);
  expect((await h.door.handle({ ...base, headers: { ...headers, "content-type": "text/plain" } })).status).toBe(415);
  expect(body).not.toHaveBeenCalled();
  let consumed = 0;
  function* chunks() {
    consumed++;
    yield Buffer.alloc(socketLimits.json + 1);
    consumed++;
    yield Buffer.from("rest");
  }
  expect(
    (await h.door.handle({ ...base, headers: { ...headers, "content-type": "application/json" }, body: chunks }))
      .status,
  ).toBe(413);
  expect(consumed).toBe(1);
});
it.each(["2025-03-26", "2025-06-18", "2025-11-25", "unknown"])("negotiates %s", async version => {
  const h = setup();
  const response = await h.request({
    jsonrpc: "2.0",
    id: "init",
    method: "initialize",
    params: { protocolVersion: version, capabilities: {}, clientInfo: { name: "test", version: "1" } },
  });
  expect(JSON.parse(response.body)).toMatchObject({
    id: "init",
    result: {
      protocolVersion: version === "unknown" ? "2025-11-25" : version,
      serverInfo: { name: "Almacén" },
      capabilities: { tools: { listChanged: false } },
      instructions: mcpTexts.instructions,
    },
  });
  expect(Object.keys(response.headers).join().toLowerCase()).not.toContain("mcp-session-id");
});
it("answers notifications, ping and the fixed tool list without initialization state", async () => {
  const h = setup();
  const notification = await h.request({ jsonrpc: "2.0", method: "notifications/initialized" });
  expect(notification.status).toBe(202);
  expect(notification.body).toBe("");
  expect(JSON.parse((await h.request({ jsonrpc: "2.0", id: 0, method: "ping" })).body)).toEqual({
    jsonrpc: "2.0",
    id: 0,
    result: {},
  });
  const list = await h.request({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  for (const name of ["leer", "acciones", "actuar", "esperar"]) expect(list.body).toContain(`"${name}"`);
  expect((await h.request({ jsonrpc: "2.0", id: 1, method: "tools/list" }, h.carla)).body).toBe(list.body);
});
it.each([
  [[], -32600],
  [{ jsonrpc: "1.0", id: 1, method: "ping" }, -32600],
  [{ jsonrpc: "2.0", id: 1, method: "apagar" }, -32601],
  [{ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, -32602],
  [{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "actuar", arguments: {} } }, -32602],
])("rejects invalid protocol messages %#", async (message, code) => {
  const h = setup();
  expect(JSON.parse((await h.request(message)).body)).toMatchObject({ error: { code } });
});
it("rejects malformed JSON without reflecting it", async () => {
  const h = setup();
  const material = randomUUID();
  const response = await h.door.handle({
    method: "POST",
    path: "/mcp",
    headers: { Authorization: `Bearer ${h.ana}`, "Content-Type": "application/json; charset=utf-8" },
    body: () => [Buffer.from(`{${material}`)],
  });
  expect(JSON.parse(response.body)).toMatchObject({ error: { code: -32700 } });
  expect(response.body.includes(material)).toBe(false);
});
