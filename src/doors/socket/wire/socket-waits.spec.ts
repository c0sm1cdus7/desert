import { clientFrame } from "./frame.ts";
import { performance } from "node:perf_hooks";
import { expect, it, vi } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { effect } from "../../../house/facts.ts";
it("N8: twenty thousand waits leave only eight alive; a change answers all admitted waits", async () => {
  const f = await socketHouse("stream");
  let now = 0;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
  try {
    const c = await f.client("beto-terminal");
    const frames = Array.from({ length: 20000 }, (_, i) =>
      clientFrame({ type: "wait", id: `w${i}`, until: f.house().now() + 200000 }),
    );
    c.socket.write(Buffer.concat(frames));
    expect(await c.until(() => c.messages.filter(m => m.type === "rejection").length === 19992, 30000)).toBe(true);
    expect(c.messages.filter(m => m.type === "response")).toHaveLength(0);
    expect(c.messages.filter(m => m.type === "rejection").every(m => m.reason === socketTexts.quota)).toBe(true);
    now = 1000;
    c.send({ type: "wait", id: "still-full", until: f.house().now() + 200000 });
    expect(await c.until(() => c.messages.some(m => m.type === "rejection" && m.id === "still-full"))).toBe(true);
    f.house().bus.emit(effect("preferred", { hide: "empty", on: true }, "ana"));
    expect(await c.until(() => c.messages.filter(m => m.type === "response").length === 8)).toBe(true);
    c.send({ type: "wait", id: "released", until: f.house().now() });
    expect(await c.until(() => c.messages.some(m => m.type === "response" && m.id === "released"))).toBe(true);
    expect(c.closed()).toBe(false);
  } finally {
    clock.mockRestore();
    await f.close();
  }
}, 40000);
it("a wait is released when its peer closes or the house shuts down", async () => {
  const f = await socketHouse("stream");
  try {
    const c = await f.client("beto-terminal");
    for (let i = 0; i < 8; i++) c.send({ type: "wait", id: `w${i}`, until: f.house().now() + 200000 });
    await new Promise<void>(resolve => setImmediate(resolve));
    c.socket.destroy();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect((await f.client("beto-terminal")).states).toHaveLength(1);
  } finally {
    await f.close();
  }
});
