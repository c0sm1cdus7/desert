import { afterEach, expect, it, vi } from "vitest";
import { socketHouse } from "../../tests/support/socket-house.ts";
import { wire } from "../../tests/support/socket-probe.ts";
import { effect } from "../house/facts.ts";
import { socketTexts } from "../texts/socket.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
let fixture: Awaited<ReturnType<typeof socketHouse>> | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  await fixture?.close();
});
async function setup() {
  fixture = await socketHouse("stream");
  return fixture;
}
it("g04: a member without the tool or action cannot report a defect", async () => {
  const f = await setup();
  const c = await f.client("beto-terminal");
  for (const tools of [[], ["payments"]]) {
    f.house().bus.emit(effect("granted", { identity: "beto", tools }, "ana"));
    f.house().bus.emit(effect("kit-set", { holder: "beto", tool: "payments", acts: [] }, "ana"));
    const before = f.house().tools.state().through;
    const replies = c.messages.filter(m => m.type === "rejection").length;
    c.socket.write(wire({ type: "default", tool: "payments", target: "payments", option: "receive" }));
    expect(await c.until(() => c.messages.filter(m => m.type === "rejection").length > replies)).toBe(true);
    expect(f.house().tools.state().through).toBe(before);
  }
});
it("g04: a permitted defect has only house text and provenance", async () => {
  const f = await setup();
  const c = await f.client("beto-terminal");
  c.socket.write(wire({ type: "default", tool: "payments", target: "payments", option: "receive" }));
  expect(await c.until(() => c.messages.some(m => m.type === "response"))).toBe(true);
  expect(f.house().tools.state().entries.at(-1)?.data).toEqual({
    tool: "payments",
    target: "payments",
    author: "beto",
    text: toolTexts.baseFailure,
  });
});
it.each(["attention", "made", "text", "author", "recipient", "silent", "draft"])(
  "g04: rejects an extra %s without writing",
  async field => {
    const f = await setup();
    const c = await f.client("beto-terminal");
    const before = f.house().tools.state().through;
    c.socket.write(wire({ type: "default", tool: "payments", target: "payments", option: "receive", [field]: true }));
    expect(await c.until(c.closed)).toBe(true);
    expect(f.house().tools.state().through).toBe(before);
  },
);
it("g03: failure writing act returns a final result, also on repeat and lookup", async () => {
  const f = await setup();
  const c = await f.client("ana-terminal");
  const append = f.house().journal.append.bind(f.house().journal);
  vi.spyOn(f.house().journal, "append").mockImplementation((event, at) => {
    if (event.layer === "house" && event.kind === "act") throw new Error("fixture write failure");
    return append(event, at);
  });
  const request = { type: "act", id: "failed", act: "prefer", input: { hide: "empty", on: true }, through: 0 };
  c.send(request);
  const result = await c.result("failed");
  expect(result?.status).toBe("rejected");
  expect(result?.reason).toEqual(toolTexts.baseFailure);
  c.send(request);
  c.send({ type: "read", id: "failed", what: "request" });
  expect(await c.until(() => c.messages.filter(m => "id" in m && m.id === "failed").length === 3)).toBe(true);
  expect(c.messages.filter(m => "id" in m && m.id === "failed")).toEqual([result, result, result]);
});
it("g03: an id reused for different content is explicitly rejected, including after restart", async () => {
  const f = await setup();
  let c = await f.client("ana-terminal");
  const request = { type: "act", id: "reused", act: "prefer", input: { hide: "empty", on: true }, through: 0 };
  c.send(request);
  expect((await c.result("reused"))?.status).toBe("accepted");
  for (const restart of [false, true]) {
    if (restart) {
      await f.reopen();
      c = await f.client("ana-terminal");
    }
    c.send({ ...request, input: { hide: "empty", on: false } });
    expect(await c.until(() => c.messages.some(m => m.type === "rejection" && m.id === "reused"))).toBe(true);
  }
});
it("g02: unauthenticated clients learn neither protocol nor Node versions", async () => {
  const f = await setup();
  const c = await f.client();
  c.hello("unknown", { protocol: 999, node: "0.0.0" });
  expect(await c.until(c.closed)).toBe(true);
  expect(c.messages).toEqual([{ type: "rejection", reason: socketTexts.denied }]);
});

it("g03b: deeply nested input still reaches a final rejection without overflowing client equality", async () => {
  const f = await setup();
  const c = await f.client("ana-terminal");
  const input: unknown = JSON.parse("[".repeat(3000) + "]".repeat(3000));
  c.send({ type: "act", id: "deep", act: "prefer", input, through: 0 });
  expect((await c.result("deep"))?.status).toBe("rejected");
});

it("g04: a legacy client-built entry cannot write text or request attention", async () => {
  const f = await setup();
  const c = await f.client("beto-terminal");
  const before = f.house().tools.state().through;
  c.socket.write(
    wire({
      type: "default",
      input: {
        tool: "payments",
        target: "payments",
        author: "ana",
        text: "invented",
        attention: true,
        made: ["payments/fake"],
      },
    }),
  );
  expect(await c.until(c.closed)).toBe(true);
  expect(f.house().tools.state().through).toBe(before);
});
it.each([
  { target: "sales", option: "receive" },
  { target: "payments", option: "missing" },
])("a defect cannot invent the action or borrow another tool's target: %j", async change => {
  const f = await setup();
  const c = await f.client("beto-terminal");
  const before = f.house().tools.state().through;
  c.send({ type: "default", tool: "payments", ...change });
  expect(await c.until(() => c.messages.some(m => m.type === "rejection"))).toBe(true);
  expect(f.house().tools.state().through).toBe(before);
});

it("a tool-only action cannot report a defect on one of its things", async () => {
  const f = await setup();
  f.house().tools.act({ act: "attend", input: { target: "sales" } }, 0, "ana");
  f.house().tools.act({ act: "register", target: "sales", input: { sale: "s1", total: 100 } }, 0, "ana");
  const c = await f.client("beto-terminal");
  const before = f.house().tools.state().through;
  c.send({ type: "default", tool: "sales", target: "sales/s1", option: "register" });
  expect(await c.until(() => c.messages.some(m => m.type === "rejection"))).toBe(true);
  expect(f.house().tools.state().through).toBe(before);
});
