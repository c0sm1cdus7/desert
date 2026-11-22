import { afterEach, expect, it } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { socketHouse } from "../../tests/support/socket-house.ts";
import { effect } from "../house/facts.ts";
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
  c.send({ type: "read", id: "cat", what: "catalog" });
  expect(await c.until(() => c.messages.some(m => m.type === "response" && m.id === "cat"))).toBe(true);
  c.send({ type: "act", id: "a", act: "prefer", input: { hide: "empty", on: true }, through: 0 });
  const result = await c.result("a");
  const count = c.messages.length;
  c.send({ type: "read", id: "a", what: "request" });
  expect(await c.until(() => c.messages.length > count)).toBe(true);
  expect(c.messages.at(-1)).toEqual(result);
  c.send({ type: "wait", id: "wait", until: f.house().now() + 1000 });
  await delay(20);
  const idle = c.messages.length;
  await delay(20);
  expect(c.messages).toHaveLength(idle);
  f.house().bus.emit(effect("boot", {}, "house"));
  expect(await c.until(() => c.messages.some(m => m.type === "response" && m.id === "wait"))).toBe(true);
  c.send({ type: "wait", id: "expired", until: 0 });
  expect(await c.until(() => c.messages.some(m => m.type === "response" && m.id === "expired"))).toBe(true);
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
  expect(last?.type).toBe("state");
  if (last?.type === "state") expect(last.seq).toBe(f.house().tools.state().through);
});
it("an agent-origin credential gets the same state, actions and catalog as its identity", async () => {
  const f = await setup();
  const c = await f.client("beto-agent");
  const seq = f.house().tools.state().through;
  c.send({ type: "act", id: "a", act: "prefer", input: { hide: "empty", on: true }, through: 0 });
  c.send({ type: "read", id: "c", what: "catalog" });
  expect(await c.result("a")).toMatchObject({ status: "accepted" });
  expect(await c.until(() => c.messages.some(m => m.type === "response" && m.id === "c"))).toBe(true);
  expect(f.house().tools.state().through).toBeGreaterThan(seq);
  expect(c.states.length).toBeGreaterThan(0);
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
  c.send({ type: "default", tool: "sales", target: "sales", option: "register" });
  expect(await c.until(() => c.messages.some(m => m.type === "response"))).toBe(true);
  expect(seen).toHaveLength(3);
  expect(seen[0]).toMatchObject({ tool: "sales", target: "sales", author: "beto" });
  expect(seen[1]).toMatchObject({ by: "beto", through: f.house().tools.state().through });
  expect(seen[2]).toMatchObject({ type: "response", id: "default" });
  expect(f.house().tools.state().entries.at(-1)).toMatchObject({ by: "beto", data: { author: "beto" } });
});

it("each result follows the state that includes that specific act", async () => {
  const f = await setup();
  const c = await f.client("ana-terminal");
  c.send({ type: "act", id: "attend", act: "attend", input: { target: "payments" }, through: 0 });
  await c.result("attend");
  c.send({
    type: "act",
    id: "p",
    act: "receive",
    target: "payments",
    input: { payment: "p", amount: 17 },
    through: 0,
  });
  expect((await c.result("p"))?.status).toBe("accepted");
  const result = c.timeline.findIndex(m => m.type === "result" && m.id === "p");
  const prior = c.timeline
    .slice(0, result)
    .filter(m => m.type === "v8")
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
    type: "act",
    id: "new",
    act: "receive",
    target: "payments",
    input: { payment: "p", amount: 10 },
    through: 0,
  });
  expect((await c.result("new"))?.status).toBe("accepted");
  expect(f.house().tools.state().tools.payments.received).toBe(20);
});
