// Exercise fresh identities, ephemeral receipts, live credentials and revocation through real house ports.
import { afterEach, expect, it } from "vitest";
import { duplexPair } from "node:stream";
import { doorHouse, invitationCode, redemptionRequest, rpcRequest } from "../../../tests/support/door-house.ts";
import { probe } from "../../../tests/support/socket-probe.ts";
import { houseDoor } from "../socket/server/house-door.ts";
import { requestBook } from "../socket/requests/request-book.ts";
import { findDoorKey } from "../../house/doors/door-material.ts";
import { isRecord } from "../../fields/json-values.ts";
const opened: ReturnType<typeof doorHouse>[] = [];
const setup = () => {
  const h = doorHouse();
  opened.push(h);
  return h;
};
afterEach(() => {
  opened.splice(0).forEach(h => h.close());
});
function keyFrom(body: string) {
  const value: unknown = JSON.parse(body);
  if (!isRecord(value) || typeof value.key !== "string") throw new Error("Missing redeemed credential");
  return value.key;
}
it("creates, redeems and enters MCP without restarting, then revokes the open wait", async () => {
  const h = setup(),
    door = h.door();
  try {
    const created = await h.act("new", { identity: "luz", tools: [] });
    expect(created.status).toBe("accepted");
    const code = invitationCode(created);
    const redeemed = await door.handle(redemptionRequest(code));
    expect(redeemed.status).toBe(200);
    expect(redeemed.headers["Cache-Control"]).toBe("no-store");
    const key = keyFrom(redeemed.body);
    expect((await door.handle(rpcRequest(key))).status).toBe(200);
    const pending = door.handle(
      rpcRequest(key, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "wait", arguments: { since: h.house().tools.state().through, seconds: 60 } },
      }),
    );
    await new Promise(resolve => setImmediate(resolve));
    const id = findDoorKey(h.house().tools.state().house.doors, key)?.id;
    expect((await h.act("revoke-key", { key: id }, "identities/luz")).status).toBe("accepted");
    expect((await pending).status).toBe(401);
    expect((await door.handle(rpcRequest(key))).status).toBe(401);
    expect([code, key, h.founder].some(material => h.history().includes(material))).toBe(false);
    h.reopen();
    expect(h.access().get(key)).toBeUndefined();
    expect(h.access().redeem(code).status).toBe(400);
  } finally {
    await door.close();
  }
});
it("rejects expired, reused and invented codes alike and limits attempts across doors", async () => {
  const h = setup(),
    first = h.door(),
    second = h.door();
  try {
    const expired = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    h.advance(86_400_000);
    const used = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    expect((await first.handle(redemptionRequest(used))).status).toBe(200);
    const failures = await Promise.all([expired, used, "invented"].map(code => first.handle(redemptionRequest(code))));
    expect(failures.every(response => response.status === 400 && response.body === failures[0]?.body)).toBe(true);
    for (let attempt = 0; attempt < 9; attempt++)
      expect((await first.handle(redemptionRequest("wrong"))).status).toBe(400);
    expect((await second.handle(redemptionRequest("wrong"))).status).toBe(429);
    h.advance(60_000);
    expect((await second.handle(redemptionRequest("wrong"))).status).toBe(400);
  } finally {
    await first.close();
    await second.close();
  }
});
it("consumes an invitation atomically when concurrent requests race", async () => {
  const h = setup(),
    door = h.door();
  try {
    const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    const responses = await Promise.all(Array.from({ length: 5 }, () => door.handle(redemptionRequest(code))));
    expect(responses.filter(response => response.status === 200)).toHaveLength(1);
    expect(responses.filter(response => response.status === 400)).toHaveLength(4);
    expect([...h.house().tools.state().house.doors.keys.values()].filter(key => key.identity === "beto")).toHaveLength(
      1,
    );
  } finally {
    await door.close();
  }
});
it("delivers an invitation only on the original request including MCP, but never through later readings", async () => {
  const h = setup(),
    book = requestBook(h.house()),
    door = h.door();
  try {
    await h.act("scene", { general: "Ready" }, "identities/ana");
    const request = {
      type: "act",
      id: "new-once",
      act: "invite",
      target: "identities/beto",
      input: { door: "agent" },
      through: h.house().tools.state().through,
    } as const;
    await h.act("attend", { target: "identities/beto" });
    const first = await book.act("ana", request);
    if (first.type !== "result") throw new Error("Missing receipt");
    const code = invitationCode(first);
    const repeated = await book.act("ana", request);
    expect("private" in repeated).toBe(false);
    const response = await door.handle(
      rpcRequest(h.founder, {
        jsonrpc: "2.0",
        id: code,
        method: "tools/call",
        params: {
          name: "act",
          arguments: {
            program: "identities",
            action: "invite",
            target: "identities/beto",
            data: { door: "agent" },
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body.includes(code)).toBe(false);
    expect(/[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/.test(response.body)).toBe(true);
    expect(h.history().includes(code)).toBe(false);
    expect((await h.act("invite", { door: "agent" }, "identities/beto", "beto")).status).toBe("rejected");
    expect((await h.act("revoke-key", { key: "missing" }, "identities/beto", "beto")).status).toBe("rejected");
  } finally {
    book.stop();
    await door.close();
  }
});
it("new socket keys enter immediately and revoking one cuts only its sessions", async () => {
  const h = setup();
  const code = invitationCode(await h.act("invite", { door: "terminal" }, "identities/beto"));
  const key = h.access().redeem(code).key;
  if (!key) throw new Error("Missing socket credential");
  const door = houseDoor(h.house(), undefined, { report: () => {} });
  const [client, server] = duplexPair();
  const peer = await probe(client);
  door.accept(server);
  peer.hello(key);
  expect(await peer.until(() => peer.messages.some(message => message.type === "welcome"))).toBe(true);
  const id = h.access().get(key)?.id;
  expect((await h.act("revoke-key", { key: id }, "identities/beto")).status).toBe("accepted");
  expect(await peer.until(() => peer.messages.some(message => message.type === "cut"))).toBe(true);
  client.destroy();
  server.destroy();
  door.cancel();
});

it("cuts an authenticated HTTP request even when its body has stopped arriving", async () => {
  const h = setup(),
    door = h.door();
  let release = () => {};
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  let answered = false;
  try {
    const key = h.access().get(h.founder);
    if (!key) throw new Error("Missing founder");
    const request = rpcRequest(h.founder);
    const pending = door
      .handle({
        ...request,
        body: async function* () {
          await blocked;
          yield Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }));
        },
      })
      .then(response => {
        answered = true;
        return response;
      });
    await h.act("revoke-key", { key: key.id }, "identities/ana");
    await new Promise(resolve => setImmediate(resolve));
    expect(answered).toBe(true);
    expect((await pending).status).toBe(401);
  } finally {
    release();
    await door.close();
  }
});
it("cuts only the revoked socket key while two keys of the same identity are waiting", async () => {
  const h = setup(),
    door = houseDoor(h.house(), undefined, { report: () => {} });
  const pairs = [duplexPair(), duplexPair()];
  try {
    const peers = [];
    const keys: string[] = [];
    for (const [client, server] of pairs) {
      const key = h.access().redeem(invitationCode(await h.act("invite", { door: "terminal" }, "identities/beto"))).key;
      if (!key) throw new Error("Missing synthetic socket key");
      keys.push(key);
      const peer = await probe(client);
      peers.push(peer);
      door.accept(server);
      peer.hello(key);
      expect(await peer.until(() => peer.messages.some(message => message.type === "welcome"))).toBe(true);
      peer.send({ type: "wait", id: "wait", until: h.house().now() + 60_000 });
    }
    await new Promise(resolve => setImmediate(resolve));
    await h.act("revoke-key", { key: h.access().get(keys[0] ?? "")?.id }, "identities/beto");
    const first = peers[0],
      second = peers[1];
    if (!first || !second) throw new Error("Missing peers");
    expect(await first.until(() => first.messages.some(message => message.type === "cut"))).toBe(true);
    second.send({ type: "read", id: "after", what: "catalog" });
    expect(
      await second.until(() => second.messages.some(message => message.type === "response" && message.id === "after")),
    ).toBe(true);
    expect(second.messages.some(message => message.type === "cut")).toBe(false);
  } finally {
    pairs.forEach(([client, server]) => {
      client.destroy();
      server.destroy();
    });
    door.cancel();
  }
});
