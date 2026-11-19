// Reopen a journal written by the old action engine through startHouse and the production remote terminal client.
import type { Shop } from "../../tests/support/shop.ts";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { legacyDoorHouse } from "../../tests/support/legacy-door-house.ts";
import { shopProgram } from "../../tests/support/shop.ts";
import { httpDoorFetch } from "../../tests/support/http-door-fetch.ts";
import { startHouse } from "./house-runtime.ts";
import { mcpDoor } from "../doors/mcp/mcp-handler.ts";
import { liveDoorKeys } from "../doors/socket/peers/live-door-keys.ts";
import { connectRemoteTerminal } from "../doors/terminal/remote-terminal-client.ts";
import { socketPorts } from "../doors/socket/client/socket-ports.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { isRecord } from "../fields/json-values.ts";
function rows(home: string) {
  const db = new DatabaseSync(join(home, "journal.sqlite"), { readOnly: true });
  try {
    return db.prepare("SELECT * FROM events ORDER BY seq").all();
  } finally {
    db.close();
  }
}
async function reopen(home: string, code: string, restart: number) {
  const h = startHouse(home, {
    ...shopProgram,
    identities: true,
    by: "house",
    creation: { admin: "ana", assignments: [{ identity: "beto", tools: [] }] },
  });
  const door = mcpDoor(h, { name: "Upgrade", version: "1", limits: { recentLines: 20 } });
  const transport = httpDoorFetch(door.handle);
  const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", "synthetic-upgrade-founder", transport.send);
  try {
    for (const state of [h.tools.state(), client.state()]) {
      const effects = [...state.house.rules.versions.values()].flatMap(versions =>
        versions.map(version => version.definition.effect),
      );
      expect(effects).toEqual(["block", "require-supervisor"]);
      expect(state.tools.sales.has("OLD-UNDER-LIMIT")).toBe(true);
    }
    const ports = socketPorts(client, { registry: h.registry, limits: { recentLines: 20 } });
    await settle(ports.act({ act: "attend", input: { target: "sales" } }, 0));
    for (const [total, expected] of [
      [1500, "accepted"],
      [100000, "rejected"],
    ] as const)
      expect(
        (
          await settle(
            ports.act({ act: "register", target: "sales", input: { sale: `CURRENT-${restart}-${total}`, total } }, 0),
          )
        ).status,
      ).toBe(expected);
    const outcomes = h.journal.replay<string[]>([], (found, event) => {
      if (event.layer === "house" && event.kind === "rule-evaluated")
        found.push(...event.data.results.map(result => result.outcome));
      return found;
    });
    expect(outcomes).toEqual(expect.arrayContaining(["passed", "block", "require-supervisor"]));
    if (!restart) {
      expect(liveDoorKeys(h).redeem(code).status).toBe(200);
      expect([...h.tools.state().house.doors.keys.values()].find(key => key.identity === "beto")?.door).toBe("agent");
    }
  } finally {
    client.close();
    transport.disconnect();
    await door.close();
    h.close();
  }
}
it("normalizes historical rules and invitation origins without rewriting old rows, across restarts", async () => {
  const fixture = legacyDoorHouse(),
    before = rows(fixture.home);
  const code = readFileSync(join(fixture.home, "invitation-fixture"), "utf8");
  try {
    for (let restart = 0; restart < 2; restart++) await reopen(fixture.home, code, restart);
    const after = rows(fixture.home);
    expect(after.slice(0, before.length)).toEqual(before);
    const origins = after
      .slice(before.length)
      .filter(row => row.kind === "door-key-issued")
      .map(row => {
        const data: unknown = JSON.parse(String(row.data));
        return isRecord(data) ? data.door : undefined;
      });
    expect(origins).toEqual(["agent"]);
  } finally {
    fixture.close();
  }
}, 20000);
