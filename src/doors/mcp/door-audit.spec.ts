// Compare hostile socket clients and MCP with the same identity, including public receipts and replayed identifiers.
import { duplexPair } from "node:stream";
import { houseDoor } from "../socket/server/house-door.ts";
import { probe, wire } from "../../../tests/support/socket-probe.ts";
import type { Shop } from "../../../tests/support/shop.ts";
import { expect, it } from "vitest";
import { doorHouse, invitationCode, rpcRequest } from "../../../tests/support/door-house.ts";
import { httpDoorFetch } from "../../../tests/support/http-door-fetch.ts";
import { connectRemoteTerminal } from "../terminal/remote-terminal-client.ts";
import { socketPorts } from "../socket/client/socket-ports.ts";
import { requestDigest } from "../socket/requests/public-message.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import { has } from "../../../tests/support/secret-search.ts";
import { programKit } from "../../house/kit-selection.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 30));
it("reads sales through both doors before and after kit removal while actions remain denied", async () => {
  const h = doorHouse(),
    door = h.door(),
    transport = httpDoorFetch(door.handle);
  const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
  const key = h.access().redeem(code).key;
  if (!key) throw new Error("Missing test key");
  await h.act("register", { sale: "before", total: 123 }, "sales");
  expect(
    h.house().tools.act({ act: "scene", input: { general: "Shared scene", to: { ana: "DIRECTED-ANA" } } }, 0, "ana")
      .status,
  ).toBe("accepted");
  const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", key, transport.send);
  try {
    const ports = socketPorts(client, { registry: h.house().registry, limits: { recentLines: 20 } });
    for (const sale of ["before", "after"]) {
      if (sale === "after") {
        h.house().bus.emit(effect("granted", { version: 2, identity: "beto", kit: programKit(["sales"]) }, "ana"));
        h.house().bus.emit(effect("granted", { version: 2, identity: "beto", kit: programKit([]) }, "ana"));
        await h.act("register", { sale, total: 123 }, "sales");
        await tick();
      }
      const response = await door.handle(
        rpcRequest(key, {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "leer", arguments: { programa: "sales" } },
        }),
      );
      expect(response.body).toContain(sale);
      expect(response.body).not.toContain('"isError":true');
      expect(client.state().tools.sales.has(sale)).toBe(true);
      expect([key, code, h.founder].some(secret => response.body.includes(secret))).toBe(false);
      expect(
        (await settle(ports.act({ act: "register", target: "sales", input: { sale: "denied", total: 1 } }, 0))).status,
      ).toBe("rejected");
    }
    const overview = await door.handle(
      rpcRequest(key, {
        jsonrpc: "2.0",
        id: "overview",
        method: "tools/call",
        params: { name: "leer", arguments: {} },
      }),
    );
    expect(overview.body).toContain("DIRECTED-ANA");
    expect(client.state().house.scenes.get("ana")?.data.to?.ana).toBe("DIRECTED-ANA");
    expect([key, code, h.founder].some(material => has(client.state(), material))).toBe(false);
    client.send({ tipo: "sincronizar" });
    await tick();
    expect(client.state().tools.sales.has("after")).toBe(true);
  } finally {
    client.close();
    transport.disconnect();
    await door.close();
    h.close();
  }
});
it("never gives an administrator the invited key through local actions, socket, MCP, retries or restart", async () => {
  const h = doorHouse();
  const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
  const invitation = [...h.house().tools.state().house.doors.invitations.keys()][0];
  const door = h.door(),
    transport = httpDoorFetch(door.handle);
  const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", h.founder, transport.send);
  try {
    const ports = socketPorts(client, { registry: h.house().registry, limits: { recentLines: 20 } });
    const local = await h.act("redeem-invitation", { invitation }, "identities/beto");
    expect(local.private).toBeUndefined();
    expect(local.status).toBe("accepted");
    expect(h.history()).toContain(doorTexts.redeemed);
    await settle(ports.act({ act: "attend", input: { target: "identities/beto" } }, 0));
    const remote = await settle(
      ports.act({ act: "redeem-invitation", target: "identities/beto", input: { invitation } }, 0),
    );
    expect(remote.private).toBeUndefined();
    const mcp = await door.handle(
      rpcRequest(h.founder, {
        jsonrpc: "2.0",
        id: "admin-redemption",
        method: "tools/call",
        params: {
          name: "actuar",
          arguments: {
            programa: "identities",
            accion: "redeem-invitation",
            objetivo: "identities/beto",
            datos: { invitation },
          },
        },
      }),
    );
    expect(mcp.body).toContain("persona invitada");
    expect([...h.house().tools.state().house.doors.invitations.values()][0]?.redeemed).toBe(false);
    const redeemed = h.access().redeem(code);
    expect(redeemed.status).toBe(200);
    expect(redeemed.key).toBeDefined();
    expect(JSON.stringify([local, remote, mcp]).includes(redeemed.key ?? "missing")).toBe(false);
  } finally {
    client.close();
    transport.disconnect();
    await door.close();
  }
  h.reopen();
  try {
    expect((await h.act("redeem-invitation", { invitation }, "identities/beto")).private).toBeUndefined();
  } finally {
    h.close();
  }
});
it("redacts live and revoked credentials in every response identifier with explicit stable correlation", async () => {
  const h = doorHouse(),
    door = h.door(),
    transport = httpDoorFetch(door.handle);
  const key = h.access().redeem(invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"))).key;
  if (!key) throw new Error("Missing test key");
  const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", h.founder, transport.send);
  const messages: unknown[] = [];
  client.receive(message => messages.push(message));
  try {
    for (const revoked of [false, true]) {
      if (revoked) await h.act("revoke-key", { key: h.access().get(key)?.id }, "identities/beto");
      for (const what of ["catalogo", "pedido", "unknown"]) client.send({ tipo: "leer", id: key, qué: what });
      await tick();
      expect(messages).toContainEqual(expect.objectContaining({ id: requestDigest(key), correlation: "sha256" }));
      expect(JSON.stringify(messages)).not.toContain(key);
    }
    const action = { tipo: "acto", id: key, act: "prefer", input: { hide: "empty", on: true }, through: 0 } as const;
    client.send(action);
    await tick();
    client.send(action);
    await tick();
    const acts = h
      .house()
      .journal.replay<number>(
        0,
        (count, event) =>
          count + Number(event.layer === "house" && event.kind === "act" && event.data.option === "prefer"),
      );
    expect(acts).toBe(1);
    expect(messages).toContainEqual(
      expect.objectContaining({ tipo: "resultado", id: requestDigest(key), status: "accepted", correlation: "sha256" }),
    );
    expect(JSON.stringify(messages)).not.toContain(key);
    client.send({ tipo: "leer", id: "ordinary", qué: "catalogo" });
    await tick();
    expect(messages).toContainEqual(expect.objectContaining({ id: "ordinary" }));
    expect(h.history()).not.toContain(key);
  } finally {
    client.close();
    transport.disconnect();
    await door.close();
    h.close();
  }
});

it.each(["hello", "frame"])(
  "keeps credentials out of %s transport failures and preserves ordinary content",
  async mode => {
    const h = doorHouse(),
      door = houseDoor(h.house()),
      pair = duplexPair();
    door.accept(pair[1]);
    const client = await probe(pair[0]);
    try {
      if (mode === "hello") client.hello(h.founder, { node: h.founder });
      else {
        client.hello(h.founder);
        expect(await client.until(() => client.messages.some(message => message.tipo === "bienvenida"))).toBe(true);
        client.send({ tipo: "leer", id: "ordinary-catalog", qué: "catalogo" });
        expect(
          await client.until(() =>
            client.messages.some(message => "id" in message && message.id === "ordinary-catalog"),
          ),
        ).toBe(true);
        expect(JSON.stringify(client.messages)).toContain("sales");
        client.socket.write(wire({ tipo: "leer", id: h.founder, qué: "catalogo", forbidden: h.founder }));
      }
      await client.until(() => client.closed());
      expect(client.closed()).toBe(true);
      expect(JSON.stringify(client.messages)).not.toContain(h.founder);
      expect(client.states.some(state => has(state, h.founder))).toBe(false);
    } finally {
      client.socket.destroy();
      pair[1].destroy();
      await door.close();
      h.close();
    }
  },
);
