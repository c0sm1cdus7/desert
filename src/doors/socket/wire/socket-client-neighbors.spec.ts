import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { shopRegistry, type Shop } from "../../../../tests/support/shop.ts";
import { socketConnection } from "../client/socket-connection.ts";
import { socketPorts } from "../client/socket-ports.ts";
import { effect } from "../../../house/facts.ts";
import { settle } from "../../../surface/bridge/ports/house-ports.ts";
import { probe } from "../../../../tests/support/socket-probe.ts";
import { readServer, type ServerMessage } from "./protocol.ts";
async function client(f: Awaited<ReturnType<typeof socketHouse>>, identity: string) {
  const connection = socketConnection<Shop>(`${identity}-terminal`);
  const pair = duplexPair();
  f.attach(pair[1]);
  await connection.attach(pair[0]);
  return {
    connection,
    ports: socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 40 } }),
    close: () => {
      connection.close();
      pair[1].destroy();
    },
  };
}
it("two identities issue equal distinct requests concurrently, with both effects and shared views", async () => {
  const f = await socketHouse("stream");
  const a = await client(f, "ana");
  const b = await client(f, "beto");
  try {
    await Promise.all([a, b].map(c => settle(c.ports.act({ act: "attend", input: { target: "payments" } }, 0))));
    const results = await Promise.all(
      [a, b].map(c =>
        settle(c.ports.act({ act: "receive", target: "payments", input: { payment: "p", amount: 11 } }, 0)),
      ),
    );
    expect(results.map(r => r.status)).toEqual(["accepted", "accepted"]);
    expect(a.ports.state().tools.payments.received).toBe(22);
    expect(b.ports.state().tools.payments.received).toBe(22);
    expect([a.ports.me, b.ports.me]).toEqual(["ana", "beto"]);
  } finally {
    a.close();
    b.close();
    await f.close();
  }
});
it("a result dropped after commit is recovered by id without a second effect", async () => {
  const f = await socketHouse("stream");
  const connection = socketConnection<Shop>("ana-terminal");
  const server = duplexPair();
  const terminal = duplexPair();
  f.attach(server[1]);
  let drop = false;
  let lost: ServerMessage | undefined;
  terminal[1].on("data", (bytes: Buffer) => server[0].write(bytes));
  server[0].on("data", (bytes: Buffer) => {
    if (drop && bytes[4] === 0 && bytes.subarray(5).toString().includes('"type":"result"')) {
      lost = readServer(JSON.parse(bytes.subarray(5).toString()));
      terminal[0].destroy();
      terminal[1].destroy();
      server[0].destroy();
      server[1].destroy();
    } else terminal[1].write(bytes);
  });
  await connection.attach(terminal[0]);
  const ports = socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 40 } });
  let second: Awaited<ReturnType<typeof probe>> | undefined;
  try {
    await settle(ports.act({ act: "attend", input: { target: "payments" } }, 0));
    drop = true;
    const answer = await settle(
      ports.act({ act: "receive", target: "payments", input: { payment: "p", amount: 13 } }, 0),
    );
    expect(answer.status).toBe("interrupted");
    expect(lost).toMatchObject({ type: "result", status: "accepted" });
    const pair = duplexPair();
    f.attach(pair[1]);
    const received: ServerMessage[] = [];
    connection.receive(message => received.push(message));
    await connection.attach(pair[0]);
    await delay(20);
    expect(received).toContainEqual(lost);
    const id = lost?.type === "result" ? lost.id : "missing";
    second = await f.client("ana-terminal");
    second.send({
      type: "act",
      id,
      act: "receive",
      target: "payments",
      input: { payment: "p", amount: 13 },
      through: 0,
    });
    expect((await second.result(id))?.status).toBe("accepted");
    expect(f.house().tools.state().tools.payments.received).toBe(13);
    connection.close();
    pair[1].destroy();
  } finally {
    connection.close();
    second?.socket.destroy();
    await f.close();
  }
});
it("closing the house during a client act settles the client and drains the complete server effect", async () => {
  let finish = () => {};
  const hold = new Promise<void>(done => {
    finish = done;
  });
  const f = await socketHouse("stream", hold);
  const c = await client(f, "ana");
  try {
    await settle(c.ports.act({ act: "attend", input: { target: "payments" } }, 0));
    const answer = settle(c.ports.act({ act: "receive", target: "payments", input: { payment: "p", amount: 17 } }, 0));
    await delay(20);
    const closing = f.server().close();
    expect((await answer).status).toBe("interrupted");
    finish();
    expect(await closing).toEqual({ remaining: 0 });
    await f.reopen();
    const again = await client(f, "ana");
    expect(again.ports.state().tools.payments.received).toBe(17);
    again.close();
  } finally {
    finish();
    c.close();
    await f.close();
  }
});
it("reconnecting during an unfinished act queries again when its final state arrives, without replay", async () => {
  let finish = () => {};
  const hold = new Promise<void>(done => {
    finish = done;
  });
  const f = await socketHouse("stream", hold);
  const c = await client(f, "ana");
  const second = duplexPair();
  try {
    await settle(c.ports.act({ act: "attend", input: { target: "payments" } }, 0));
    const answer = settle(c.ports.act({ act: "receive", target: "payments", input: { payment: "p", amount: 19 } }, 0));
    await expect.poll(() => f.house().tools.state().processing.size).toBe(1);
    f.attach(second[1]);
    const replies: ServerMessage[] = [];
    const sends: string[] = [];
    c.connection.receive(m => replies.push(m));
    const send = c.connection.send;
    c.connection.send = m => {
      sends.push(m.type);
      return send(m);
    };
    await c.connection.attach(second[0]);
    expect((await answer).status).toBe("interrupted");
    await expect.poll(() => replies).toContainEqual(expect.objectContaining({ type: "result", status: "processing" }));
    finish();
    await expect.poll(() => replies).toContainEqual(expect.objectContaining({ type: "result", status: "accepted" }));
    expect(sends).not.toContain("act");
    expect(c.ports.state().tools.payments.received).toBe(19);
  } finally {
    finish();
    c.close();
    second[1].destroy();
    await f.close();
  }
});

it("recovery preserves an interrupted result that already had its own reason", async () => {
  const f = await socketHouse("stream");
  try {
    const act = f
      .house()
      .bus.emit(
        effect("act", { object: "payments", option: "receive", input: {}, through: 0 }, "ana", [
          'socket-request:["ana","ended"]',
        ]),
      );
    f.house().bus.emit(
      effect("act-result", { act: act.id, status: "interrupted", reason: "La persona canceló" }, "ana", [act.id]),
    );
    await f.reopen();
    const c = await f.client("ana-terminal");
    c.send({ type: "read", what: "request", id: "ended" });
    expect(await c.result("ended")).toMatchObject({ status: "interrupted", reason: "La persona canceló" });
  } finally {
    await f.close();
  }
});
