import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createAgentMcpServer } from "../src/mcp/server.ts";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { Notebook } from "../products/notebook/product.ts";
import { Requests } from "../src/web/protocol.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());

async function fixture() {
  const host = await openLocalController(compile(Notebook), { ...await cluster.database(), roles: ["notes"] });
  const identity = await host.identities.issue("MCP owner");
  const session = host.connect(identity.token, "agent");
  const server = createAgentMcpServer(session);
  const client = new Client({ name: "desert-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { host, identity, session, client, async close() { await client.close(); await server.close(); await host.close(); } };
}

test("MCP exposes the same request schemas and only the agent's published contract", async () => {
  const f = await fixture();
  try {
    const tools = (await f.client.listTools()).tools;
    assert.deepEqual(tools.map(tool => tool.name).sort(), ["accept", "begin", "catalog", "offer", "preflight", "prepare", "read", "receipt"]);
    assert.deepEqual(tools.find(tool => tool.name === "prepare")!.inputSchema, JSON.parse(JSON.stringify(Requests.prepare)));
    const catalog = await f.client.callTool({ name: "catalog", arguments: {} });
    assert.deepEqual(catalog.structuredContent, compile(Notebook).surface("agent"));
    assert.equal(JSON.stringify(catalog.structuredContent).includes("credential_hash"), false);
    assert.throws(() => createAgentMcpServer(f.host.connect(f.identity.token, "human")), /MCP_AGENT_SURFACE_REQUIRED/);
    assert.throws(() => createAgentMcpServer({ ...f.session }), /UNTRUSTED_LOCAL_SESSION/);
    const invalid = await f.client.callTool({ name: "begin", arguments: { journeyId: "read-note", bypass: true } });
    assert.equal(invalid.isError, true);
  } finally { await f.close(); }
});

test("MCP preparation is separate from acceptance; recovery, guards and revoked identity remain canonical", async () => {
  const f = await fixture();
  try {
    async function call(name: string, args: Record<string, unknown>) {
      const response = await f.client.callTool({ name, arguments: args });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      return (response.structuredContent as { result: unknown }).result;
    }
    const run = await call("begin", { journeyId: "create-note" }) as { id: string };
    const intent = await call("prepare", { runId: run.id, input: { title: "MCP note", body: "Shared canonical runtime" } }) as { id: string; confirmationDigest: string };
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    const forged = await f.client.callTool({ name: "accept", arguments: { intentId: intent.id, confirmationDigest: "wrong" } });
    assert.deepEqual(forged.structuredContent, { error: "CONFIRMATION_MISMATCH" });
    const receipt = await call("accept", { intentId: intent.id, confirmationDigest: intent.confirmationDigest });
    assert.deepEqual(await call("accept", { intentId: intent.id, confirmationDigest: intent.confirmationDigest }), receipt);
    assert.deepEqual(await call("receipt", { intentId: intent.id }), receipt);
    const records = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(records.length, 1);
    assert.equal(records[0]!.facts.title, "MCP note");
    const other = f.host.connect((await f.host.identities.issue("Other")).token, "agent");
    assert.deepEqual(await other.read((await other.begin("read-note")).id), []);
    await f.host.identities.revoke(f.identity.id);
    const revoked = await f.client.callTool({ name: "begin", arguments: { journeyId: "read-note" } });
    assert.deepEqual(revoked.structuredContent, { error: "UNAUTHENTICATED" });
  } finally { await f.close(); }
});
