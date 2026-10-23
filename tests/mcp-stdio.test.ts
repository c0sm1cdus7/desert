import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

test("an independent MCP stdio process uses the same durable controller and published reads", { timeout: 20000 }, async () => {
  const cluster = postgresCluster(), database = await cluster.database();
  const host = await openLocalController(compile(Notebook), { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Stdio agent");
  const client = new Client({ name: "stdio-proof", version: "1" });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL("./fixtures/mcp-stdio.ts", import.meta.url))],
    env: { DESERT_MCP_TEST_CONFIGURATION: JSON.stringify({ database, token: identity.token }) }, stderr: "pipe" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 8);
    const started = await client.callTool({ name: "begin", arguments: { journeyId: "read-note" } });
    assert.notEqual(started.isError, true);
    const run = (started.structuredContent as { result: { id: string } }).result;
    const read = await client.callTool({ name: "read", arguments: { runId: run.id } });
    assert.deepEqual(read.structuredContent, { result: [] });
    await host.identities.revoke(identity.id);
    const denied = await client.callTool({ name: "read", arguments: { runId: run.id } });
    assert.deepEqual(denied.structuredContent, { error: "UNAUTHENTICATED" });
  } finally { await client.close(); await transport.close(); await host.close(); cluster.dispose(); }
});
