// A second member cannot recover embedded credentials from new facts, historical replay or either door.
import { requestDigest } from "../socket/requests/public-message.ts";
import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { doorFingerprint } from "../../house/doors/door-material.ts";
import { join } from "node:path";
import { doorHouse, invitationCode, rpcRequest } from "../../../tests/support/door-house.ts";
import { httpDoorFetch } from "../../../tests/support/http-door-fetch.ts";
import { shopProgram, type Shop } from "../../../tests/support/shop.ts";
import { has } from "../../../tests/support/secret-search.ts";
import { connectRemoteTerminal } from "../terminal/remote-terminal-client.ts";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { effect } from "../../house/facts.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 40));
it.each([false, true])("protects state, journal and envelopes across restart (historical=%s)", async historical => {
  const h = doorHouse();
  const key = h.access().redeem(invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"))).key;
  if (!key) throw new Error("Missing test key");
  const material = historical ? randomBytes(32).toString("base64url") : h.founder;
  const founderId = historical ? "legacy-founder" : h.access().get(material)?.id;
  const embedded = `token_${material}_end`,
    clean = `token_${mcpTexts.redacted}_end`;
  if (historical) {
    h.house().close();
    const raw = new SqliteJournal(join(h.home, "journal.sqlite"), shopProgram.words);
    raw.append(
      effect(
        "door-key-issued",
        { id: "legacy-founder", identity: "ana", door: "agent", fingerprint: doorFingerprint(material) },
        "ana",
      ),
      1_800_000_000_000,
    );
    raw.append(effect("scene", { general: embedded, to: { [embedded]: "ordinary" } }, "ana"), 1_800_000_000_000);
    raw.close();
    h.reopen();
  } else {
    expect(h.house().tools.act({ act: "scene", input: { general: embedded } }, 0, "ana").status).toBe("accepted");
    h.house().bus.emit(effect("scene", { general: embedded, to: { [embedded]: "ordinary" } }, "ana"));
  }
  const inspect = async (
    client: Awaited<ReturnType<typeof connectRemoteTerminal<Shop>>>,
    door: ReturnType<typeof h.door>,
    restart: boolean,
  ) => {
    for (const phase of ["initial", "difference", "resync"]) {
      if (phase === "difference") {
        const general = `word${restart}${material}word`;
        expect(h.house().tools.act({ act: "scene", input: { general } }, 0, "ana").status).toBe("accepted");
        h.house().bus.emit(effect("scene", { general, to: { [embedded]: "ordinary" } }, "ana"));
        await tick();
      }
      if (phase === "resync") {
        await h.act("revoke-key", { key: founderId }, "identities/ana");
        client.send({ tipo: "sincronizar" });
        await tick();
      }
      expect(has(client.state(), material)).toBe(false);
      const scene = client.state().house.scenes.get("ana")?.data;
      expect(scene?.general).toContain(mcpTexts.redacted);
      expect(scene?.to?.[clean]).toBe("ordinary");
      const recovered = scene?.general.replace(/^token_|_end$/g, "");
      expect(recovered && h.access().get(recovered)).toBeUndefined();
      if (recovered) expect((await door.handle(rpcRequest(recovered))).status).toBe(401);
      for (const method of ["ping", "unknown", "tools/call"]) {
        const response = await door.handle(
          rpcRequest(key, { jsonrpc: "2.0", id: embedded, method, params: { name: "read", arguments: {} } }),
        );
        expect(response.body.includes(material)).toBe(false);
        expect(JSON.parse(response.body)).toMatchObject({ id: requestDigest(embedded), correlation: "sha256" });
        if (method === "tools/call") expect(response.body).toContain("ordinary");
      }
      expect(h.history().includes(material)).toBe(false);
    }
  };
  for (const restart of [false, true]) {
    if (restart) h.reopen();
    const door = h.door(),
      transport = httpDoorFetch(door.handle);
    const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", key, transport.send);
    try {
      await inspect(client, door, restart);
    } finally {
      client.close();
      transport.disconnect();
      await door.close();
    }
  }
  // Historical rows remain immutable evidence; current writes never contain the credential on disk.
  h.house().close();
  const raw = new SqliteJournal(join(h.home, "journal.sqlite"), shopProgram.words, undefined, "preserve");
  try {
    const materialPresent = raw.replay(false, (found, event) => found || JSON.stringify(event).includes(material));
    expect(materialPresent).toBe(historical);
  } finally {
    raw.close();
    h.close();
  }
});
