// The complete remote wire runs without sockets; live keys govern both doors and interrupted acts are not replayed.
import { afterEach, expect, it, vi } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { doorHouse, invitationCode, rpcRequest } from "../../../tests/support/door-house.ts";
import { httpDoorFetch } from "../../../tests/support/http-door-fetch.ts";
import { connectRemoteTerminal } from "../terminal/remote-terminal-client.ts";
import { httpStream } from "../socket/client/http-stream.ts";
import { socketConnection } from "../socket/client/socket-connection.ts";
import { socketPorts } from "../socket/client/socket-ports.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { shopShown, type Shop } from "../../../tests/support/shop.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { keysOf } from "../terminal/input.ts";
import { clientFrame } from "../socket/wire/frame.ts";
import { houseProtocolVersion } from "../socket/wire/protocol.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const stop of cleanups.reverse()) await stop();
  cleanups.length = 0;
  vi.restoreAllMocks();
});
async function setup(origin: "agent" | "terminal" = "agent") {
  const h = doorHouse();
  cleanups.push(h.close);
  const code = invitationCode(await h.act("invite", { door: origin }, "identities/ana"));
  const key = h.access().redeem(code).key;
  if (!key) throw new Error("Missing synthetic credential");
  const door = h.door();
  cleanups.push(door.close);
  const transport = httpDoorFetch(request => door.handle(request));
  cleanups.push(transport.disconnect);
  const connection = socketConnection<Shop>("http");
  cleanups.push(connection.close);
  const attach = async () => {
    await connection.attach(await httpStream("https://unit.invalid/mcp", key, undefined, transport.send));
  };
  await attach();
  const ports = socketPorts(connection, { registry: h.house().registry, limits: { recentLines: 40 } });
  return { h, key, door, transport, connection, attach, ports };
}
it.each(["agent", "terminal"] as const)("uses one %s-origin credential for state, actions and MCP", async origin => {
  const { h, key, door, transport, connection, ports } = await setup(origin);
  expect(connection.identity()).toBe("ana");
  expect(connection.state().through).toBe(h.house().tools.state().through);
  expect((await door.handle(rpcRequest(key))).status).toBe(200);
  expect((await settle(ports.act({ act: "attend", input: { target: "sales" } }, 0))).status).toBe("accepted");
  expect(
    (await settle(ports.act({ act: "register", target: "sales", input: { sale: "remote", total: 123 } }, 0))).status,
  ).toBe("accepted");
  expect(connection.state().tools.sales.get("remote")?.total).toBe(123);
  expect(transport.posted.join("\n")).not.toContain(key);
  expect(h.history()).not.toContain(key);
});
it("closes the remote action receipt before returning to the menu and reading the saved sale", async () => {
  const { h, ports } = await setup();
  const router = houseRouter(ports, shopShown);
  cleanups.push(() => router.stop());
  const press = (bytes: string) => keysOf(bytes).forEach(key => router.send(key));
  const screen = () => router.screen({ rows: 30 });
  press("v");
  press("rremote-receipt\r1500\r");
  await router.idle();
  expect(JSON.stringify(screen().body)).toContain("Registrada · remote-receipt");
  expect(h.house().tools.state().tools.sales.get("remote-receipt")?.total).toBe(1500);
  expect(screen().hints).toContainEqual({ intent: "cancel", does: "cerrar" });
  press("\x1b");
  expect(screen().title).toBe("Ventas");
  press("\x0f");
  expect(screen().title).toBe("Menú");
  press("v");
  expect(JSON.stringify(screen().body)).toContain("remote-receipt");
});
it("reconnects after a lost response by querying its identifier, never replaying its action", async () => {
  const { h, transport, connection, attach, ports } = await setup();
  await settle(ports.act({ act: "attend", input: { target: "sales" } }, 0));
  let cut = false;
  const stop = h.house().bus.on(event => {
    if (!cut && event.kind === "sale-registered") {
      cut = true;
      transport.disconnect();
    }
  });
  cleanups.push(stop);
  const result = await settle(ports.act({ act: "register", target: "sales", input: { sale: "once", total: 500 } }, 0));
  expect(result.status).toBe("interrupted");
  await attach();
  await delay(20);
  expect(connection.state().tools.sales.get("once")?.total).toBe(500);
  expect(transport.posted.filter(body => body.includes('"act":"register"'))).toHaveLength(1);
  expect(transport.posted.some(body => body.includes('"qué":"pedido"'))).toBe(true);
});
it("revokes the open stream and MCP while another key remains usable, without outputting credentials", async () => {
  const output = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const { h, key, door, connection, transport } = await setup();
  await h.act("revoke-key", { key: h.access().get(key)?.id }, "identities/ana");
  await vi.waitFor(() => expect(connection.status()).not.toBe("connected"));
  expect((await door.handle(rpcRequest(key))).status).toBe(401);
  await expect(httpStream("https://unit.invalid", key, undefined, transport.send)).rejects.toThrow(socketTexts.denied);
  expect((await door.handle(rpcRequest(h.founder))).status).toBe(200);
  expect(JSON.stringify(output.mock.calls)).not.toContain(key);
  expect(h.history()).not.toContain(key);
});
it("rejects invalid keys before consuming bodies and binds a stream to its credential", async () => {
  const { h, key, door } = await setup();
  const body = vi.fn(() => []);
  for (const method of ["GET", "POST"]) {
    expect(
      (await door.handle({ method, path: "/door/socket", headers: { authorization: "Bearer invalid" }, body })).status,
    ).toBe(401);
  }
  expect(body).not.toHaveBeenCalled();
  const signal = new AbortController();
  cleanups.push(() => signal.abort());
  const opened = await door.handle({
    method: "GET",
    path: "/door/socket",
    headers: { authorization: `Bearer ${key}` },
    body,
    signal: signal.signal,
  });
  expect(opened.status).toBe(200);
  const response = await door.handle({
    ...rpcRequest(h.founder, { tipo: "sincronizar" }),
    path: "/door/socket",
    headers: {
      authorization: `Bearer ${h.founder}`,
      "desert-session": opened.headers["Desert-Session"],
      "content-type": "application/json",
    },
  });
  expect(response.status).toBe(409);
});
it("does not expose URL or credentials in failed transport errors or follow redirects", async () => {
  const send = vi.fn<typeof fetch>(() => Promise.reject(new Error("synthetic-private-payload")));
  await expect(httpStream("http://remote.invalid", "synthetic-private-payload", undefined, send)).rejects.toThrow(
    socketTexts.remoteAddress,
  );
  expect(send).not.toHaveBeenCalled();
  await expect(httpStream("https://unit.invalid", "synthetic-private-payload", undefined, send)).rejects.toThrow(
    socketTexts.beforeState,
  );
  expect(send.mock.calls[0]?.[1]?.redirect).toBe("error");
});
it("automatically reconnects the terminal and stops retrying when its live credential is revoked", async () => {
  const { h, key, transport } = await setup();
  const connection = await connectRemoteTerminal<Shop>("https://unit.invalid", key, transport.send);
  cleanups.push(connection.close);
  transport.disconnect();
  await vi.waitFor(() => expect(connection.status()).toBe("signal-lost"));
  await vi.waitFor(() => expect(connection.status()).toBe("connected"), { timeout: 3000 });
  expect(connection.identity()).toBe("ana");
  await h.act("revoke-key", { key: h.access().get(key)?.id }, "identities/ana");
  await vi.waitFor(() => expect(connection.status()).toBe("disconnected"), { timeout: 3000 });
});
it("revocation interrupts a pending POST body before it can start an action", async () => {
  const { h, key, door } = await setup();
  const controller = new AbortController();
  cleanups.push(() => controller.abort());
  const headers = { authorization: `Bearer ${key}`, "content-type": "application/json" };
  const opened = await door.handle({
    method: "GET",
    path: "/door/socket",
    headers,
    body: () => [],
    signal: controller.signal,
  });
  let release = () => {};
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  cleanups.push(release);
  const pending = door.handle({
    method: "POST",
    path: "/door/socket",
    headers: { ...headers, "desert-session": opened.headers["Desert-Session"] },
    body: async function* () {
      await blocked;
      yield Buffer.from(
        JSON.stringify({ tipo: "acto", id: "revoked", act: "prefer", input: { hide: "empty", on: true }, through: 0 }),
      );
    },
  });
  await h.act("revoke-key", { key: h.access().get(key)?.id }, "identities/ana");
  expect((await pending).status).toBe(401);
  release();
  await delay(10);
  expect(h.history()).not.toContain('socket-request:[\\"ana\\",\\"revoked\\"]');
});
it("refuses remote shutdown and hides a credential supplied as the Node version", async () => {
  const { h, key, connection, door } = await setup();
  const answers: string[] = [];
  connection.receive(message => answers.push(JSON.stringify(message)));
  expect(connection.send({ tipo: "apagar" })).toBe(true);
  await vi.waitFor(() => expect(answers.some(answer => answer.includes('"id":"apagar"'))).toBe(true));
  expect(connection.status()).toBe("connected");
  const transport = httpDoorFetch(request => door.handle(request));
  cleanups.push(transport.disconnect);
  const stream = await httpStream("https://unit.invalid", key, undefined, transport.send);
  cleanups.push(() => {
    stream.destroy();
  });
  const output: Buffer[] = [];
  stream.on("data", (bytes: Buffer) => output.push(bytes));
  stream.write(clientFrame({ tipo: "hola", protocolo: houseProtocolVersion, node: key, token: "http" }));
  await vi.waitFor(() => expect(stream.destroyed).toBe(true));
  expect(Buffer.concat(output).toString()).not.toContain(key);
  expect(h.history()).not.toContain(key);
});
