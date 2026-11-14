import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, it } from "vitest";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { socketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
import { PortFailure } from "../../tools/failures/port-failure.ts";
import { settle } from "../../surface/bridge/house-ports.ts";
import { type Shop, shopRegistry } from "../../../tests/support/shop.ts";
const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const clean of cleanups.reverse()) await clean();
  cleanups.length = 0;
});
async function setup(hold?: Promise<void>, who = "ana") {
  const f = await socketHouse("stream", hold);
  cleanups.push(f.close);
  const connection = socketConnection<Shop>(`${who}-terminal`);
  cleanups.push(connection.close);
  const attach = async () => {
    const pair = duplexPair();
    f.attach(pair[1]);
    await connection.attach(pair[0]);
    return pair;
  };
  const pair = await attach();
  const ports = socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 40 } });
  return { f, connection, ports, pair, attach };
}
it("receives the identity view, house clock, changes and all four connection states", async () => {
  const { f, connection, ports, pair, attach } = await setup();
  expect(ports.connection()).toBe("connected");
  expect(ports.me).toBe("ana");
  expect(ports.state().through).toBe(f.house().tools.state().through);
  const before = ports.now();
  await delay(20);
  expect(ports.now() - before).toBeGreaterThanOrEqual(15);
  pair[0].destroy();
  pair[1].destroy();
  await delay(10);
  expect(ports.connection()).toBe("signal-lost");
  const states: string[] = [];
  ports.watch(() => states.push(ports.connection()));
  await attach();
  expect(states).toContain("connecting");
  expect(ports.connection()).toBe("connected");
  connection.close();
  expect(ports.connection()).toBe("disconnected");
});
it("folds before results and shares only automatic in-flight observations", async () => {
  const { f, ports } = await setup();
  const value = { act: "attend", input: { target: "payments" } };
  const one = ports.observe?.(value);
  const two = ports.observe?.({ input: { target: "payments" }, act: "attend" });
  expect(one?.status).toBe("processing");
  expect(two).toBe(one);
  expect((await settle(one ?? ports.act(value, 0))).status).toBe("accepted");
  expect(
    f
      .house()
      .journal.replay(0, (n, a) => n + Number(a.layer === "house" && a.kind === "act" && a.data.option === "attend")),
  ).toBe(1);
  expect(
    (await settle(ports.act({ act: "receive", target: "payments", input: { payment: "p", amount: 7 } }, 0))).status,
  ).toBe("accepted");
  expect(ports.state().tools.payments.received).toBe(7);
});
it("cuts settle without rejection; offline sends nothing; reconnection only queries", async () => {
  let resolve = () => {};
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  const { f, ports, pair, attach, connection } = await setup(promise);
  await settle(ports.act({ act: "attend", input: { target: "payments" } }, 0));
  const sent: string[] = [];
  const send = connection.send;
  connection.send = m => {
    sent.push(m.tipo);
    return send(m);
  };
  const pending = settle(ports.act({ act: "receive", target: "payments", input: { payment: "p", amount: 9 } }, 0));
  await delay(20);
  pair[0].destroy();
  pair[1].destroy();
  const result = await pending;
  expect(result.status).toBe("interrupted");
  expect(result.reason).toContain("Actividad");
  const count = sent.length;
  await settle(ports.act({ act: "prefer", input: { hide: "empty", on: true } }, 0));
  expect(sent).toHaveLength(count);
  resolve();
  await delay(20);
  await attach();
  await delay(20);
  expect(sent.filter(tipo => tipo === "acto")).toHaveLength(1);
  expect(sent).toContain("leer");
  expect(f.house().tools.state().tools.payments.received).toBe(9);
  expect(ports.state().tools.payments.received).toBe(9);
});
it("defect public text excludes thrown act data and the server prepares the diagnostic", async () => {
  const { f, ports } = await setup();
  let prepared = false;
  const original = f.house().tools.prepare;
  f.house().tools.prepare = value => {
    prepared = true;
    return original(value);
  };
  const text = ports.defect(new PortFailure("private-act-data"), "payments", "payments", "receive");
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toContain("private-act-data");
  await delay(20);
  expect(prepared).toBe(true);
  expect(f.house().tools.state().entries.at(-1)?.data.text).toBe(text);
});
