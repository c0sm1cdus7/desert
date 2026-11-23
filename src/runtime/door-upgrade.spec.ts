// Reopen a migrated journal of the old action engine through startHouse and the production remote terminal client.
import type { Shop } from "../../tests/support/shop.ts";
import { expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UnmigratedJournal } from "../house/members.ts";
import { migrateStoredNames } from "./stored-names.ts";
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
    creation: {
      admin: "ana",
      language: "es",
      assignments: [{ identity: "beto", tools: [], language: "es" }],
    },
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
      // The migration gave each identity the language it has seen the house in so far.
      expect([...state.house.languages]).toEqual([
        ["ana", "es"],
        ["beto", "es"],
      ]);
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
it("opens a migrated journal of the old engine, keeping its rules and invitation origins across restarts", async () => {
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
it("refuses a journal whose identities have no language until the migration gives them Spanish", () => {
  const home = mkdtempSync(join(tmpdir(), "desert-unspoken-"));
  const backups = mkdtempSync(join(tmpdir(), "desert-unspoken-backups-"));
  const options = {
    ...shopProgram,
    identities: true,
    by: "house",
    creation: {
      admin: "ana",
      language: "en" as const,
      assignments: [{ identity: "beto", tools: [], language: "en" as const }],
    },
  };
  try {
    startHouse(home, options).close();
    const db = new DatabaseSync(join(home, "journal.sqlite"));
    // The journal as it was before 23/11: the same facts, none of them saying a language, numbered without gaps.
    db.exec(`drop trigger events_no_delete; delete from snapshots;
      create temporary table kept as select * from events where kind <> 'language-set' order by seq;
      delete from events;
      insert into events select row_number() over (order by seq), id, at, kind, by, cause, data, process from kept;`);
    db.close();
    expect(() => startHouse(home, options)).toThrow(UnmigratedJournal);
    expect(() => startHouse(home, options)).toThrow("Identities without a language: ana, beto");
    expect(migrateStoredNames(join(home, "journal.sqlite"), "house", backups)).toMatchObject({ spoken: 2 });
    const h = startHouse(home, options);
    try {
      expect([...h.tools.state().house.languages]).toEqual([
        ["ana", "es"],
        ["beto", "es"],
      ]);
    } finally {
      h.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(backups, { recursive: true, force: true });
  }
});
