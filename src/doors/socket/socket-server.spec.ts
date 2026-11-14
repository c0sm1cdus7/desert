import { afterEach, describe, expect, it } from "vitest";
import { readdirSync, statSync, existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { effect } from "../../journal/events.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
describe.each(["stream", "unix"] as const)("%s", transport => {
  let fixture: Awaited<ReturnType<typeof socketHouse>> | undefined;
  afterEach(async () => {
    await fixture?.close();
    fixture = undefined;
  });
  const setup = async () => {
    fixture = await socketHouse(transport);
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
  it("one writer, concurrent clients, no client storage, ordered state and silence at rest", async () => {
    const f = await setup();
    const files = readdirSync(f.home).sort();
    const a = await f.client("ana-terminal");
    const b = await f.client("beto-terminal");
    expect(a.messages[0]?.tipo).toBe("bienvenida");
    expect(b.states).toHaveLength(1);
    expect(() => f.openAgain()).toThrow("already open");
    a.send(attend("a"));
    b.send(attend("b"));
    expect((await a.result("a"))?.status).toBe("accepted");
    expect((await b.result("b"))?.status).toBe("accepted");
    a.send(pay("one"));
    b.send(pay("two"));
    await a.result("one");
    await b.result("two");
    expect(f.house().tools.state().tools.payments.received).toBe(20);
    expect(a.order[a.order.indexOf("resultado") - 1]).toBe("v8");
    expect(readdirSync(f.home).sort()).toEqual(files);
    if (transport === "unix") expect(statSync(f.server().path).mode & 0o777).toBe(0o600);
    if (transport === "unix") expect(existsSync(`${f.home}/casa.pid`)).toBe(true);
    await delay(30);
    const count = a.messages.length;
    await delay(50);
    expect(a.messages).toHaveLength(count);
  });
  it("same identity and request execute once, including reconnection and server restart", async () => {
    const f = await setup();
    const a = await f.client("ana-terminal");
    expect(a.states).toHaveLength(1);
    a.send(attend("attend"));
    await a.result("attend");
    a.send(pay("once"));
    a.send(pay("once"));
    const result = await a.result("once");
    expect(result?.status).toBe("accepted");
    await f.reopen();
    const b = await f.client("ana-terminal");
    b.send(pay("once"));
    expect(await b.result("once")).toEqual(result);
    expect(f.house().tools.state().tools.payments.received).toBe(10);
  });
  it("nonmembers receive no data; removing membership cuts live peers, empty grants still read", async () => {
    const f = await setup();
    const outsider = await f.client("nadie-terminal");
    expect(outsider.states).toHaveLength(0);
    expect(outsider.messages.some(m => m.tipo === "bienvenida")).toBe(false);
    f.house().bus.emit(effect("granted", { identity: "mind:payments", tools: ["payments"] }, "ana"));
    const mind = await f.client("mente-terminal");
    expect(await mind.until(mind.closed)).toBe(true);
    expect([mind.states.length, mind.messages]).toEqual([0, [{ tipo: "rechazo", motivo: socketTexts.denied }]]);
    const b = await f.client("beto-terminal");
    expect(b.states).toHaveLength(1);
    f.house().bus.emit(effect("granted", { identity: "beto", tools: [] }, "ana"));
    expect(await b.until(() => b.states.length === 2)).toBe(true);
    expect(b.closed()).toBe(false);
    f.house().bus.emit(effect("removed", { identity: "beto" }, "ana"));
    expect(await b.until(b.closed)).toBe(true);
    const count = b.states.length;
    f.house().bus.emit(effect("boot", {}, "house"));
    await delay(20);
    expect(b.states).toHaveLength(count);
  });
});
