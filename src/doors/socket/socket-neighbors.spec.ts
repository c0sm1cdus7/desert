import { afterEach, expect, it, vi } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { effect } from "../../journal/events.ts";
import { identityView } from "../../house/house.ts";
let fixture: Awaited<ReturnType<typeof socketHouse>> | undefined;
afterEach(async () => {
  vi.useRealTimers();
  await fixture?.close();
  fixture = undefined;
});
const setup = async (hold?: Promise<void>) => {
  fixture = await socketHouse("stream", hold);
  return fixture;
};
const attend = (id: string) => ({ tipo: "acto", id, act: "attend", input: { target: "payments" }, through: 0 });
const pay = (id: string) => ({
  tipo: "acto",
  id,
  act: "receive",
  target: "payments",
  input: { payment: "p", amount: 10 },
  through: 0,
});
it("pending duplicate, lost response, and identity-scoped IDs do not conflate distinct acts", async () => {
  const held = heldAct();
  const f = await setup(held.promise);
  const a = await f.client("ana-terminal");
  const retry = await f.client("ana-terminal");
  const b = await f.client("beto-terminal");
  a.send(attend("a"));
  b.send(attend("b"));
  await a.result("a");
  await b.result("b");
  a.send(pay("same"));
  expect(await a.until(() => f.house().tools.state().processing.size === 1)).toBe(true);
  retry.send(pay("same"));
  expect((await retry.result("same"))?.status).toBe("processing");
  b.send(pay("same"));
  expect(await b.until(() => f.house().tools.state().processing.size === 2)).toBe(true);
  a.socket.destroy();
  held.resolve();
  await b.result("same");
  const again = await f.client("ana-terminal");
  again.send(pay("same"));
  expect((await again.result("same"))?.status).toBe("accepted");
  expect(f.house().tools.state().tools.payments.received).toBe(20);
});
it("members with no tools see the same tools and peer activity as identityView", async () => {
  const f = await setup();
  const a = await f.client("ana-terminal");
  const b = await f.client("beto-terminal");
  f.house().bus.emit(effect("granted", { identity: "beto", tools: [] }, "ana"));
  a.send(attend("a"));
  await a.result("a");
  a.send(pay("p"));
  await a.result("p");
  await b.until(() => b.states.length > 2);
  expect(b.states.at(-1)).toEqual(identityView(f.house().tools.state(), "beto"));
  expect(f.house().tools.state().tools.payments.received).toBe(10);
  expect(
    f
      .house()
      .tools.state()
      .entries.some(entry => entry.data.text === "Recibido · p"),
  ).toBe(true);
});
it("unauthenticated requests disclose no catalog, results or state and cannot act", async () => {
  const f = await setup();
  const seq = f.house().tools.state().through;
  for (const request of [{ tipo: "leer", id: "x", qué: "catalogo" }, pay("x"), { tipo: "apagar" }]) {
    const c = await f.client();
    c.send(request);
    expect(await c.until(c.closed)).toBe(true);
    expect(c.messages).toEqual([]);
    expect(c.states).toEqual([]);
  }
  const bad = await f.client("invalid-key");
  expect(await bad.until(bad.closed)).toBe(true);
  expect(bad.messages.map(message => message.tipo)).toEqual(["rechazo"]);
  expect(f.house().tools.state().through).toBe(seq);
});
it("revocation during an act suppresses its result and all subsequent state", async () => {
  const held = heldAct();
  const f = await setup(held.promise);
  const c = await f.client("beto-terminal");
  c.send(attend("a"));
  await c.result("a");
  c.send(pay("p"));
  expect(await c.until(() => f.house().tools.state().processing.size === 1)).toBe(true);
  f.house().bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect(await c.until(c.closed)).toBe(true);
  const count = c.states.length;
  held.resolve();
  await delay(20);
  expect(c.messages.some(m => m.tipo === "resultado" && m.id === "p")).toBe(false);
  expect(c.states).toHaveLength(count);
});
it("graceful shutdown waits for an act, delivers its outcome, and rejects new accepts", async () => {
  const held = heldAct();
  const f = await setup(held.promise);
  const c = await f.client("ana-terminal");
  c.send(attend("a"));
  await c.result("a");
  c.send(pay("p"));
  expect(await c.until(() => f.house().tools.state().processing.size === 1)).toBe(true);
  const closing = f.server().close();
  let settled = false;
  void closing.then(() => {
    settled = true;
  });
  await delay(30);
  expect(settled).toBe(false);
  expect(await c.until(() => c.messages.some(m => m.tipo === "cerrando"))).toBe(true);
  expect(c.closed()).toBe(false);
  held.resolve();
  expect(await closing).toEqual({ remaining: 0 });
  expect((await c.result("p"))?.status).toBe("accepted");
  const late = await f.client();
  expect(await late.until(late.closed)).toBe(true);
});
it("ten-second deadline counts unresolved acts and restart never repeats them", async () => {
  const held = heldAct();
  const f = await setup(held.promise);
  const c = await f.client("ana-terminal");
  c.send(attend("a"));
  await c.result("a");
  c.send(pay("p"));
  expect(await c.until(() => f.house().tools.state().processing.size === 1)).toBe(true);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const closing = f.server().close();
  let settled = false;
  void closing.then(() => {
    settled = true;
  });
  await vi.advanceTimersByTimeAsync(9999);
  await delay(20);
  expect(settled).toBe(false);
  expect(c.closed()).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await closing).toEqual({ remaining: 1 });
  vi.useRealTimers();
  await f.reopen();
  const retry = await f.client("ana-terminal");
  retry.send(pay("p"));
  expect((await retry.result("p"))?.status).toBe("interrupted");
  held.resolve();
  await delay(20);
  expect(f.house().tools.state().tools.payments.received).toBe(0);
});
it("only admin may shut down; disconnecting one peer leaves the house alive", async () => {
  const f = await setup();
  const b = await f.client("beto-terminal");
  b.send({ tipo: "apagar" });
  expect(await b.until(() => b.messages.some(m => m.tipo === "rechazo"))).toBe(true);
  b.send({ tipo: "chau" });
  expect(await b.until(b.closed)).toBe(true);
  const a = await f.client("ana-terminal");
  a.send({ tipo: "apagar" });
  expect(await a.until(a.closed)).toBe(true);
  expect(a.messages.some(m => m.tipo === "cerrando")).toBe(true);
});

function heldAct() {
  let resolve = () => {};
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
