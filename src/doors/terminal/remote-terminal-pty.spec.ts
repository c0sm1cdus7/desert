// Real PTY and localhost HTTP acceptance: one renderer opens, acts, reconnects and loses access on live revocation.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { realTerminal, type TerminalOptions } from "../../checks/real-terminal.ts";
import { doorHouse, rpcRequest } from "../../../tests/support/door-house.ts";
import { serveMcp } from "../mcp/mcp-http.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
function config(url: string, key: string) {
  const directory = mkdtempSync(join(tmpdir(), "remote-pty-config-"));
  writeFileSync(
    join(directory, ".mcp.json"),
    JSON.stringify({ mcpServers: { void: { type: "http", url, headers: { Authorization: `Bearer ${key}` } } } }),
    { mode: 0o600 },
  );
  return directory;
}
function terminal(directory: string, options: TerminalOptions = {}) {
  return realTerminal(
    [process.execPath, join(import.meta.dirname, "../../../tests/support/remote-terminal-open.ts"), directory],
    { cols: 110, rows: 36 },
    {},
    options,
  );
}
it("http: opens the real terminal, reads, acts, reconnects after server restart and revokes both doors", async () => {
  const h = doorHouse();
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  let client: ReturnType<typeof terminal> | undefined;
  let directory: string | undefined;
  const log = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    server = await serveMcp(h.door(), { host: "127.0.0.1", port: 0 });
    const address = server.address;
    if (!address || typeof address === "string") throw new Error("Missing HTTP address");
    const url = `http://127.0.0.1:${address.port}/mcp`;
    directory = config(url, h.founder);
    client = terminal(directory);
    await client.until("[v] ventas");
    client.press("v");
    await client.until("Registradas");
    client.press("rremote-pty\r1500\r");
    await client.until("Registrada · remote-pty");
    expect(h.house().tools.state().tools.sales.get("remote-pty")?.total).toBe(1500);
    client.press("\x1b");
    await client.until("[r] registrar");
    client.press("\x0f");
    await client.until("Menú");
    client.press("v");
    await client.until("remote-pty");
    await server.close();
    server = undefined;
    await client.until("×");
    h.reopen();
    server = await serveMcp(h.door(), { host: "127.0.0.1", port: address.port });
    await client.until("●");
    expect(client.screen().join("\n")).toContain("remote-pty");
    expect(h.house().tools.state().tools.sales.size).toBe(1);
    await h.act("revoke-key", { key: h.access().get(h.founder)?.id }, "identities/ana");
    await client.until("×");
    const request = rpcRequest(h.founder);
    const denied = await fetch(url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(denied.status).toBe(401);
    expect(client.written()).not.toContain(h.founder);
    expect(JSON.stringify(log.mock.calls)).not.toContain(h.founder);
    expect(h.history()).not.toContain(h.founder);
  } finally {
    await client?.close();
    await server?.close();
    h.close();
    if (directory) rmSync(directory, { recursive: true, force: true });
    log.mockRestore();
  }
}, 20000);
it("http: an invalid credential shows a catalogued refusal on the real terminal without exposing its key", async () => {
  const h = doorHouse();
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  let client: ReturnType<typeof terminal> | undefined;
  let directory: string | undefined;
  try {
    server = await serveMcp(h.door(), { host: "127.0.0.1", port: 0 });
    const address = server.address;
    if (!address || typeof address === "string") throw new Error("Missing HTTP address");
    const key = "synthetic-invalid-remote-key";
    directory = config(`http://127.0.0.1:${address.port}/mcp`, key);
    client = terminal(directory, { expectedExit: { code: 1, signal: null } });
    await client.until(socketTexts.denied);
    expect(client.written()).not.toContain(key);
    expect(client.written()).not.toContain("Error:");
    expect(client.written()).not.toContain(" at ");
  } finally {
    await client?.close();
    await server?.close();
    h.close();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}, 10000);
