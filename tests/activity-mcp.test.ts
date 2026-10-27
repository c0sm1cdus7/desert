import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createAgentMcpServer } from "../src/mcp/server.ts";
import { activityFixture } from "./fixtures/activity.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { storedObjects } from "../src/testing/stored-objects.ts";

test("MCP discovers and resumes the same activity occurrence without delegated authority or implicit writes", async () => {
  const cluster = postgresCluster(), f = await activityFixture(cluster);
  const session = f.controller.connect(f.identity.token, "agent");
  const server = createAgentMcpServer(session), client = new Client({ name: "activity-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  try {
    const tools = (await client.listTools()).tools;
    assert.equal(tools.find(tool => tool.name === "activityList")!.annotations?.readOnlyHint, true);
    assert.equal(tools.find(tool => tool.name === "activityCreate")!.annotations?.idempotentHint, true);
    assert.equal(tools.find(tool => tool.name === "activityReopen")!.annotations?.readOnlyHint, false);
    const occurrence = randomUUID(), input = { occurrence, plan: f.plan };
    const created = await client.callTool({ name: "activityCreate", arguments: input });
    assert.notEqual(created.isError, true);
    assert.deepEqual(await client.callTool({ name: "activityCreate", arguments: input }), created);
    const state = (created.structuredContent as { result: { id: string; revision: number } }).result;
    const answered = await session.activityAnswer(state.id, state.revision, 0, { title: "Agent private" });
    const list = await client.callTool({ name: "activityList", arguments: {} });
    assert.equal(JSON.stringify(list).includes("Agent private"), false);
    const reopened = await client.callTool({ name: "activityReopen", arguments: { id: state.id, revision: answered.revision, step: 0 } });
    assert.deepEqual(reopened.structuredContent, { result: await session.activityRead(state.id) });
    const forged = await client.callTool({ name: "activityList", arguments: { actor: "Bob" } });
    assert.equal(forged.isError, true);
    assert.deepEqual((await f.session.activityList()).items, [], "human and agent surfaces do not inherit each other's drafts");
    assert.equal((await storedObjects(f.admin, f.application)).length, 0);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_runs")).rows[0].count, "0");
  } finally { await client.close(); await server.close(); await f.close(); cluster.dispose(); }
});
