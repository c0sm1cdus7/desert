// The actual cloud composition binds custody's root to the MCP host credential before any request is served.
import { meant } from "../fields/phrases.ts";
import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { startCloudHouse } from "./cloud-house.ts";
import { shopProgram } from "../../tests/support/shop.ts";
import { mcpDoor, deriveHostCredential } from "../doors/mcp/mcp-handler.ts";
import { rpcRequest } from "../../tests/support/door-house.ts";
import { mcpRows, mcpResult } from "../../tests/support/mcp-results.ts";
import { oauthTexts } from "../texts/oauth.texts.ts";

it("admits root A as the cloud host and rejects root B at composition, with and without OAuth", async () => {
  const home = mkdtempSync("/tmp/desert-cloud-root-");
  const before = process.listeners("SIGTERM");
  const root = Buffer.alloc(32, 71);
  const cloud = startCloudHouse(
    {
      ...shopProgram,
      by: "house",
      creation: {
        admin: "ana",
        language: "es",
        assignments: [{ identity: "ana", tools: [], language: "es" }],
      },
    },
    home,
    { ROOT: root.toString("hex") },
    "ROOT",
  );
  const stop = process.listeners("SIGTERM").find(listener => !before.includes(listener));
  const options = { name: "Casa", version: "1", limits: { recentLines: 20 }, rootKey: root };
  const door = mcpDoor(cloud.door, { ...options, oauth: { origin: "https://house.example" } });
  try {
    const read = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read", arguments: {} } };
    const response = await door.handle(rpcRequest(deriveHostCredential(root), read));
    expect(response.status).toBe(200);
    expect(mcpRows(mcpResult(response.body))).toMatchObject({ identity: "ana" });
    const wrong = Buffer.alloc(32, 72);
    expect((await door.handle(rpcRequest(deriveHostCredential(wrong)))).status).toBe(401);
    for (const oauth of [undefined, { origin: "https://house.example" }])
      expect(() => mcpDoor(cloud.door, { ...options, rootKey: wrong, ...(oauth ? { oauth } : {}) })).toThrow(
        meant(oauthTexts.rootMismatch),
      );
    expect(
      cloud.door.journal.replay<string[]>([], (events, event) => [...events, JSON.stringify(event)]).join(""),
    ).not.toContain(deriveHostCredential(root));
  } finally {
    await door.close();
    stop?.("SIGTERM");
    rmSync(home, { recursive: true, force: true });
  }
});
