// Review 2 of house-mind0b: does the written-cause check get it wrong? Copied to src/tools/boundaries/.
import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../house/facts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.close());
  vi.useRealTimers();
});
const tick = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));
function opened() {
  const desk = zeroMind("desk");
  const other = zeroMind("other", undefined, []);
  const rig = shopRig({ registry: [...shopRegistry, desk.tool, other.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  return { rig, desk, other };
}
const has = (rig: ReturnType<typeof shopRig>, id: string) => rig.facts().some(e => e.id === id);

it("queue: a together rolled back during a delivery never reaches the mind", async () => {
  const { rig, desk } = opened();
  let heardId = "";
  let once = 0;
  const results: unknown[] = [];
  // desk's mind acts every time it hears its own wake-at (any program could listen this way)
  desk.startup().bus.on("wake-at", e => {
    if (e.data.id === "desk:two") {
      heardId = e.id;
      results.push(desk.act());
    }
  });
  // on hearing a house stimulus (delivered outside any transaction), the program asks for two wake-ups together;
  // the second belongs to another tool and is rejected, so the whole together rolls back
  desk.startup().bus.on("stimulus", () => {
    if (once++) return;
    try {
      desk.startup().bus.together(() => {
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:two", at: Date.now() + 5 } });
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "other:zero", at: null } });
      });
    } catch {
      /* the program catches the rejection */
    }
  });
  rig.bus.emit(effect("stimulus", { tool: "desk" }, "shop"));
  await tick(60);
  await Promise.all(results);
  expect(heardId).toBe("");
  expect(results).toEqual([]);
  expect(rig.facts().filter(e => e.kind === "woke")).toEqual([]);
  expect(desk.pending).toEqual([]);
});
it("clock: a rolled-back wake-up neither arms the clock nor makes the mind act", async () => {
  const { rig, desk } = opened();
  let once = 0;
  desk.startup().bus.on("stimulus", () => {
    if (once++) return;
    try {
      desk.startup().bus.together(() => {
        desk.schedule(Date.now() + 5); // desk:zero, the wake-up zeroMind attends to
        throw new Error("the program changes its mind");
      });
    } catch {
      /* caught */
    }
  });
  rig.bus.emit(effect("stimulus", { tool: "desk" }, "shop"));
  await tick(80);
  expect(desk.pending).toEqual([]);
  expect(rig.facts().filter(e => e.kind === "wake-at" && e.data.id === "desk:zero")).toEqual([]);
  expect(rig.facts().filter(e => e.kind === "woke" || e.kind === "mind-noted")).toEqual([]);
  expect(rig.state().wakeOwners.has("desk:zero")).toBe(false);
});
it("flat nesting: an inner together that fails and is caught does not roll back, but the act is rejected", async () => {
  const { rig, desk } = opened();
  let pending: Promise<unknown> | undefined;
  let stim = "";
  desk.startup().bus.on("stimulus", e => {
    stim = e.id;
    pending = desk.act();
  });
  rig.bus.together(() => {
    try {
      rig.bus.together(() => {
        rig.bus.emit(effect("stimulus", { tool: "desk" }, "shop"));
        throw new Error("internal");
      });
    } catch {
      /* the outer one goes on */
    }
  });
  const r = await pending;
  expect(has(rig, stim)).toBe(false);
  expect(r).toMatchObject({ status: "rejected" });
});
it("continuation: transaction A committed, a later B rolls back; the request born in A", async () => {
  const { rig, desk } = opened();
  let release = () => {};
  let pending: Promise<unknown> | undefined;
  desk.startup().bus.on("stimulus", e => {
    if (e.data.tool === "A")
      pending = new Promise<void>(r => {
        release = r;
      }).then(() => desk.act());
  });
  rig.bus.together(() => rig.bus.emit(effect("stimulus", { tool: "A" }, "shop")));
  try {
    rig.bus.together(() => {
      rig.bus.emit(effect("stimulus", { tool: "B" }, "shop"));
      release();
      throw new Error("B rolls back");
    });
  } catch {
    /* */
  }
  expect(await pending).toStrictEqual({ status: "accepted" });
});
it("outside any listener while another write rolls back", async () => {
  const { rig, desk } = opened();
  let pending: Promise<unknown> | undefined;
  try {
    rig.bus.together(() => {
      rig.bus.emit(effect("stimulus", { tool: "x" }, "shop"));
      pending = desk.act(); // called from unrelated code, hearing nothing
      throw new Error("rolls back");
    });
  } catch {
    /* */
  }
  const timerResult = await new Promise(resolve => setTimeout(() => resolve(desk.act()), 0));
  expect(await pending).toMatchObject({ status: "rejected" });
  expect(timerResult).toStrictEqual({ status: "accepted" });
});
it("two houses in the same process: a listener of one requests in the other", async () => {
  const a = opened();
  const b = opened();
  let pending: Promise<unknown> | undefined;
  a.desk.startup().bus.on("stimulus", () => {
    pending = b.desk.act();
  });
  try {
    a.rig.bus.together(() => {
      a.rig.bus.emit(effect("stimulus", { tool: "x" }, "shop"));
      throw new Error("A rolls back");
    });
  } catch {
    /* */
  }
  const r = await pending;
  const cause = b.rig.facts().find(e => e.kind === "act")?.cause;
  expect(r).toStrictEqual({ status: "accepted" });
  expect(cause).toEqual([]);
});
it("flatProgram: the failed together inside an act is not written", () => {
  const { rig, desk } = opened();
  let caught = "";
  desk.startup().bus.on("sale-registered", e => {
    if (e.by !== "ana") return;
    try {
      desk.startup().bus.together(() => {
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:middle", at: null } });
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "other:foreign", at: null } });
      });
    } catch (error) {
      caught = (error instanceof Error ? error.message : String(error)).slice(0, 40);
    }
  });
  rig.attend("ana", "sales");
  const r = rig.act("ana", "register", { sale: "s", total: 1 }, "sales");
  const middle = rig
    .facts()
    .filter(e => e.kind === "wake-at" && e.data.id === "desk:middle")
    .map(e => e.by);
  expect(caught).not.toBe("");
  expect(r.status).toBe("accepted");
  expect(middle).toEqual([]);
});
