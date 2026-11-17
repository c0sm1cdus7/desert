import { randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { fixture, secret } from "../../../tests/support/secret-rig.ts";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { mcpDoor } from "./mcp-handler.ts";
const doors: ReturnType<typeof mcpDoor>[] = [];
afterEach(async () => {
  for (const door of doors.splice(0)) await door.close();
});
it("marks secret inputs and never returns material or private receipts", async () => {
  const material = randomUUID();
  const receipt = randomUUID();
  const key = randomUUID();
  const rig = fixture(secret, () => ({ status: "accepted", text: "Guardado", private: receipt }));
  const door = mcpDoor(rig.house, new Map([[key, { identity: "ana", door: "agente" }]]), {
    name: "Prueba",
    version: "1",
    limits: { recentLines: 20 },
  });
  doors.push(door);
  const call = (name: string, args: unknown) =>
    door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: () => [
        Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })),
      ],
    });
  const responses = [
    await call("acciones", {}),
    await call("actuar", { herramienta: "vault", accion: "set", datos: { value: material } }),
    await call("leer", {}),
    await call("leer", { herramienta: "vault" }),
    await call("actuar", { herramienta: "vault", accion: "missing", datos: { value: material } }),
  ];
  expect(responses[0]?.body).toContain('secret\\\":true');
  expect(JSON.parse(responses[1]?.body ?? "")).toMatchObject({ result: { isError: false } });
  for (const response of responses) {
    expect([key, material, receipt].some(secret => response.body.includes(secret))).toBe(false);
  }
});
it("never reflects door credentials, even when used as request ids or public text", async () => {
  const h = mcpHouse();
  try {
    const ping = await h.request({ jsonrpc: "2.0", id: h.ana, method: "ping" });
    const invalid = await h.request({ jsonrpc: "2.0", id: h.ana, method: "unknown" });
    const accepted = await h.call("actuar", {
      herramienta: "sales",
      accion: "register",
      datos: { sale: h.ana, total: 100 },
    });
    const reading = await h.call("leer", { herramienta: "sales" });
    expect([ping, invalid, accepted, reading].some(response => response.body.includes(h.ana))).toBe(false);
  } finally {
    await h.close();
  }
});
