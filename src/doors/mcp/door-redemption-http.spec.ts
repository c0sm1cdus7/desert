// A loopback integration proves the executable redemption entry writes directly to a private MCP file.
import { spawn } from "node:child_process";
import { join } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { expect, it } from "vitest";
import { doorHouse, invitationCode } from "../../../tests/support/door-house.ts";
import { serveMcp } from "./mcp-http.ts";
import { isRecord } from "../../fields/json-values.ts";
function runClient(address: string, file: string, code: string) {
  return new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["src/runtime/redeem-door-cli.ts", address, "--claude", file, "--name", "test-house"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.on("data", chunk => {
      output += String(chunk);
    });
    child.stderr.on("data", chunk => {
      output += String(chunk);
    });
    child.once("error", reject);
    child.once("exit", status => resolve({ status, output }));
    child.stdin.end(`${code}\n`);
  });
}
it("redeems over localhost, saves MCP authorization privately and enters without exposing the key", async () => {
  const h = doorHouse(),
    door = h.door();
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  try {
    const code = invitationCode(await h.act("new", { identity: "luz", tools: [] }));
    server = await serveMcp(door, { host: "127.0.0.1", port: 0 });
    const address = server.address;
    if (!address || typeof address === "string") throw new Error("Missing loopback address");
    const url = `http://127.0.0.1:${address.port}`;
    const file = join(h.home, "client-configuration.json");
    const client = await runClient(url, file, code);
    expect(client.status).toBe(0);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const configuration: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!isRecord(configuration) || !isRecord(configuration.mcpServers)) throw new Error("Missing MCP configuration");
    const entry = configuration.mcpServers["test-house"];
    if (!isRecord(entry) || !isRecord(entry.headers) || typeof entry.headers.Authorization !== "string")
      throw new Error("Missing authorization");
    const authorization = entry.headers.Authorization;
    const response = await fetch(`${url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(response.status).toBe(200);
    expect(
      [code, authorization.slice(7)].some(
        material => client.output.includes(material) || h.history().includes(material),
      ),
    ).toBe(false);
  } finally {
    if (server) await server.close();
    else await door.close();
    h.close();
  }
});
