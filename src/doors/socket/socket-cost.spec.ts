import { expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { identityView } from "../../house/house.ts";
import { stateFrame, serverFrame } from "./frame.ts";
import { socketHouse } from "../../../tests/support/socket-house.ts";
function measure(state: unknown, seq: number, ahora: number) {
  const elapsed: number[] = [];
  let bytes = 0;
  let stateBytes = 0;
  for (let n = 0; n < 30; n++) {
    const start = performance.now();
    stateBytes = stateFrame(state).length;
    bytes = stateBytes + serverFrame({ tipo: "estado", seq, ahora }).length;
    elapsed.push(performance.now() - start);
  }
  return {
    bytes,
    stateBytes,
    meanMs: elapsed.reduce((sum, ms) => sum + ms, 0) / elapsed.length,
    maxMs: Math.max(...elapsed),
  };
}
it("measures the test shop's initial and populated identityView, and delivery over a stream", async () => {
  const f = await socketHouse("stream");
  try {
    const c = await f.client("ana-terminal");
    const initial = measure(
      identityView(f.house().tools.state(), "ana"),
      f.house().tools.state().through,
      f.house().now(),
    );
    f.house().tools.act({ act: "attend", input: { target: "sales" } }, 0, "ana");
    for (let n = 0; n < 100; n++)
      f.house().tools.act(
        { act: "register", target: "sales", input: { sale: `s${n}`, total: 1500 } },
        f.house().tools.state().through,
        "ana",
      );
    const populated = measure(
      identityView(f.house().tools.state(), "ana"),
      f.house().tools.state().through,
      f.house().now(),
    );
    const before = c.states.length;
    const start = performance.now();
    expect(await c.until(() => c.states.length > before)).toBe(true);
    const deliveryMs = performance.now() - start;
    expect(populated.bytes).toBeLessThan(16 * 1024 * 1024);
    expect(c.states.at(-1)).toEqual(identityView(f.house().tools.state(), "ana"));
    console.info(JSON.stringify({ measurement: "shop-state", initial, populated, sales: 100, deliveryMs }));
  } finally {
    await f.close();
  }
});
