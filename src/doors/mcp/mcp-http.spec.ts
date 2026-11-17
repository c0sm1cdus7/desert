import { expect, it } from "vitest";
import { request } from "node:http";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { serveMcp } from "./mcp-http.ts";
it("serves health and an authenticated MCP request through a real HTTP socket", async () => {
  const h = mcpHouse();
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  try {
    server = await serveMcp(h.door, { host: "127.0.0.1", port: 0 });
    const address = server.address;
    if (!address || typeof address === "string") throw new Error("Missing TCP address");
    const send = (path: string, body?: string) =>
      new Promise<{ status: number; text: string }>((resolve, reject) => {
        const outgoing = request(
          {
            host: "127.0.0.1",
            port: address.port,
            path,
            method: body ? "POST" : "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${h.ana}` },
          },
          response => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", chunk => {
              text += String(chunk);
            });
            response.on("end", () => resolve({ status: response.statusCode ?? 0, text }));
          },
        );
        outgoing.on("error", reject);
        outgoing.end(body);
      });
    expect(await send("/salud")).toEqual({ status: 200, text: "ok" });
    const ping = await send("/mcp", JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }));
    expect(ping.status).toBe(200);
    expect(JSON.parse(ping.text)).toEqual({ jsonrpc: "2.0", id: 1, result: {} });
    expect((await send("/mcp")).status).toBe(405);
  } finally {
    if (server) await server.close();
    await h.close();
  }
});
