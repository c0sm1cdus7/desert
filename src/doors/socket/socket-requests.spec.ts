import { afterEach, expect, it } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { effect } from "../../journal/events.ts";
let fixture: Awaited<ReturnType<typeof socketHouse>> | undefined;
afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});
const setup = async () => {
  fixture = await socketHouse("stream");
  return fixture;
};
it("catalog, request lookup, wait on change and wait expiry are authenticated JSON replies", async () => {
  const f = await setup();
  const c = await f.client("ana-terminal");
  c.send({ tipo: "leer", id: "cat", qué: "catalogo" });
  expect(await c.until(() => c.messages.some(m => m.tipo === "respuesta" && m.id === "cat"))).toBe(true);
  c.send({ tipo: "acto", id: "a", act: "prefer", input: { hide: "empty", on: true }, through: 0 });
  const result = await c.result("a");
  const count = c.messages.length;
  c.send({ tipo: "leer", id: "a", qué: "pedido" });
  expect(await c.until(() => c.messages.length > count)).toBe(true);
  expect(c.messages.at(-1)).toEqual(result);
  c.send({ tipo: "esperar", id: "wait", hasta: f.house().now() + 1000 });
  await delay(20);
  const idle = c.messages.length;
  await delay(20);
  expect(c.messages).toHaveLength(idle);
  f.house().bus.emit(effect("boot", {}, "house"));
  expect(await c.until(() => c.messages.some(m => m.tipo === "respuesta" && m.id === "wait"))).toBe(true);
  c.send({ tipo: "esperar", id: "expired", hasta: 0 });
  expect(await c.until(() => c.messages.some(m => m.tipo === "respuesta" && m.id === "expired"))).toBe(true);
});
it("a whole turn's changes yield one final state, with its monotonic sequence", async () => {
  const f = await setup();
  const c = await f.client("ana-terminal");
  const count = c.states.length;
  for (let n = 0; n < 10; n++) f.house().bus.emit(effect("boot", {}, "house"));
  expect(await c.until(() => c.states.length > count)).toBe(true);
  await delay(20);
  expect(c.states).toHaveLength(count + 1);
  const last = c.messages.at(-1);
  expect(last?.tipo).toBe("estado");
  if (last?.tipo === "estado") expect(last.seq).toBe(f.house().tools.state().through);
});
it("the agent door gets neither state nor terminal action, lookup, defect or catalog shortcuts", async () => {
  const f = await setup();
  const c = await f.client("beto-agente");
  const seq = f.house().tools.state().through;
  c.send({ tipo: "acto", id: "a", act: "prefer", input: { hide: "empty", on: true }, through: 0 });
  c.send({ tipo: "leer", id: "c", qué: "catalogo" });
  expect(await c.until(() => c.messages.filter(m => m.tipo === "rechazo").length === 2)).toBe(true);
  expect(f.house().tools.state().through).toBe(seq);
  expect(c.states).toEqual([]);
});
it("defect provenance comes from the key and the house prepares the client entry", async () => {
  const f = await setup();
  const c = await f.client("beto-terminal");
  const prepare = f.house().tools.prepare;
  const seen: unknown[] = [];
  f.house().tools.prepare = value => {
    seen.push(value);
    return prepare(value);
  };
  c.send({ tipo: "defecto", entrada: { tool: "sales", target: "sales", author: "ana", text: "No se pudo" } });
  expect(await c.until(() => c.messages.some(m => m.tipo === "respuesta"))).toBe(true);
  expect(seen).toHaveLength(1);
  expect(f.house().tools.state().entries.at(-1)).toMatchObject({ by: "beto", data: { author: "beto" } });
});

it("each result follows the state that includes that specific act", async () => {
  const f = await setup();
  const c = await f.client("ana-terminal");
  c.send({ tipo: "acto", id: "attend", act: "attend", input: { target: "payments" }, through: 0 });
  await c.result("attend");
  c.send({
    tipo: "acto",
    id: "p",
    act: "receive",
    target: "payments",
    input: { payment: "p", amount: 17 },
    through: 0,
  });
  expect((await c.result("p"))?.status).toBe("accepted");
  const result = c.timeline.findIndex(m => m.tipo === "resultado" && m.id === "p");
  const prior = c.timeline
    .slice(0, result)
    .filter(m => m.tipo === "v8")
    .at(-1);
  expect(prior?.state).toMatchObject({ tools: { payments: { received: 17 } } });
});
it("old acts without request identity remain readable and do not suppress new requests", async () => {
  const f = await setup();
  f.house().tools.act({ act: "attend", input: { target: "payments" } }, 0, "ana");
  f.house().tools.act({ act: "receive", target: "payments", input: { payment: "p", amount: 10 } }, 0, "ana");
  await f.reopen();
  const c = await f.client("ana-terminal");
  c.send({
    tipo: "acto",
    id: "new",
    act: "receive",
    target: "payments",
    input: { payment: "p", amount: 10 },
    through: 0,
  });
  expect((await c.result("new"))?.status).toBe("accepted");
  expect(f.house().tools.state().tools.payments.received).toBe(20);
});
