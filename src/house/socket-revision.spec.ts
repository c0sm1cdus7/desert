import { performance } from "node:perf_hooks";
import { same } from "../fields/phrases.ts";
import { duplexPair } from "node:stream";
import { afterEach, expect, it, vi } from "vitest";
import { socketHouse } from "../../tests/support/socket-house.ts";
import { socketConnection } from "../doors/socket/client/socket-connection.ts";
import { socketLimits } from "../doors/socket/wire/protocol.ts";
import { socketTexts } from "../texts/socket.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
afterEach(() => vi.restoreAllMocks());
it("N6: the second terminal eight seconds later takes the welcome clock, including reconnect", async () => {
  const f = await socketHouse("stream");
  const now = vi.spyOn(f.house(), "now");
  vi.spyOn(performance, "now").mockReturnValue(0);
  const clients = [];
  try {
    for (const token of ["ana-terminal", "ana-terminal", "beto-terminal"]) {
      const clock = 1_800_000_000_000 + clients.length * 8000;
      now.mockReturnValue(clock);
      const pair = duplexPair();
      f.attach(pair[1]);
      const client = socketConnection(token);
      clients.push({ client, pair });
      await client.attach(pair[0]);
      expect(Math.abs(client.now() - clock)).toBeLessThan(100);
    }
    const first = clients[0];
    if (!first) throw new Error("Missing fixture terminal");
    const pair = duplexPair();
    f.attach(pair[1]);
    now.mockReturnValue(1_800_000_024_000);
    clients.push({ client: first.client, pair });
    await first.client.attach(pair[0]);
    expect(Math.abs(first.client.now() - 1_800_000_024_000)).toBeLessThan(100);
  } finally {
    clients.forEach(({ client, pair }) => {
      client.close();
      pair[1].destroy();
    });
    await f.close();
  }
});
it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
  "N7: inherited %s is not an action",
  async option => {
    const f = await socketHouse("stream");
    try {
      const c = await f.client("beto-terminal");
      const before = f.house().tools.state().through;
      c.send({ type: "default", tool: "payments", target: "payments", option });
      expect(await c.until(() => c.messages.some(m => m.type === "rejection"))).toBe(true);
      expect(c.messages.at(-1)).toMatchObject({ type: "rejection", reason: toolTexts.unknown });
      expect(f.house().tools.state().through).toBe(before);
    } finally {
      await f.close();
    }
  },
);
it("N8: two thousand cheap requests have a per-connection quota and visible refusals", async () => {
  const f = await socketHouse("stream");
  vi.spyOn(performance, "now").mockReturnValue(0);
  try {
    const c = await f.client("beto-terminal");
    const before = f.house().tools.state().through;
    for (let i = 0; i < 2000; i++) c.send({ type: "default", tool: "payments", target: "payments", option: "receive" });
    expect(
      await c.until(
        () => c.messages.filter(m => m.type === "response" || m.type === "rejection").length === 2000,
        30000,
      ),
    ).toBe(true);
    expect(c.messages.filter(m => m.type === "response")).toHaveLength(32);
    expect(c.messages.filter(m => m.type === "rejection")).toHaveLength(1968);
    expect(c.messages.filter(m => m.type === "rejection").every(m => same(m.reason, socketTexts.quota))).toBe(true);
    expect(
      f
        .house()
        .tools.state()
        .entries.filter(e => e.seq > before && e.data.author === "beto" && same(e.data.text, toolTexts.baseFailure)),
    ).toHaveLength(32);
    const other = await f.client("ana-terminal");
    other.send({ type: "read", what: "catalog", id: "other" });
    expect(await other.until(() => other.messages.some(m => m.type === "response" && m.id === "other"))).toBe(true);
  } finally {
    await f.close();
  }
}, 40000);
it("N12: thirty-two silent introductions yield their oldest slot to a real terminal", async () => {
  const f = await socketHouse("stream");
  const pairs = Array.from({ length: socketLimits.unintroduced }, () => duplexPair());
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  try {
    pairs.forEach(pair => f.attach(pair[1]));
    const c = await f.client("ana-terminal");
    expect(c.states).toHaveLength(1);
    expect(pairs[0]?.[1].destroyed).toBe(true);
    expect(pairs.slice(1).every(pair => !pair[1].destroyed)).toBe(true);
  } finally {
    pairs.forEach(pair => pair.forEach(s => s.destroy()));
    await f.close();
  }
});
