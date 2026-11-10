// Attention is a tool-wide stimulus with a perpetual, replayable ladder, the same for every identity of the house.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { identityView } from "../house/house.ts";
import { effect } from "../journal/events.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";

let rig: ReturnType<typeof shopRig>;
let sold = 0;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  sold = 0;
  rig = shopRig();
  rig.attend("beto", "sales");
});
afterEach(() => {
  rig.close();
  vi.useRealTimers();
});
/** Beto registers a sale; ana, who has the tool, did not write it. */
const sell = () => rig.act("beto", "register", { sale: `s${++sold}`, total: 10 }, "sales");
const notices = () => rig.facts().filter(event => event.kind === "stimulus" && event.by === "ana");
const ana = () => identityView(rig.state(), "ana");

describe("tool attention", () => {
  it("stimulates immediately and repeats at 1, 2, 4, 8, 16, 32, 60, 60 minutes without stopping", () => {
    expect(sell().status).toBe("accepted");
    expect(notices()).toHaveLength(1);
    expect(ana().attention.has("sales")).toBe(true);
    let count = 1;
    for (const minutes of [1, 2, 4, 8, 16, 32, 60, 60, 60]) {
      vi.advanceTimersByTime(minutes * 60_000 - 1);
      expect(notices()).toHaveLength(count);
      vi.advanceTimersByTime(1);
      count += 1;
      expect(notices()).toHaveLength(count);
    }
    expect(ana().attention.get("sales")?.delay).toBe(3_600_000);
  });

  it("calls only whoever did not write the entry, and only if the tool is theirs", () => {
    const other = shopRig({ grants: { ana: ["payments"], beto: ["sales"], carla: ["sales"] } });
    try {
      other.attend("beto", "sales");
      other.act("beto", "register", { sale: "s1", total: 10 }, "sales");
      const called = other.facts().flatMap(event => (event.kind === "stimulus" ? [event.by] : []));
      expect(called).toEqual(["carla"]);
    } finally {
      other.close();
    }
  });

  it("clears the whole tool on attending it and stops its ladder", () => {
    sell();
    vi.advanceTimersByTime(60_000);
    rig.attend("ana", "sales/s1");
    expect(ana().attention.size).toBe(0);
    vi.advanceTimersByTime(8 * 3_600_000);
    expect(notices()).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("new entries on an attended tool stimulate without requiring attention", () => {
    rig.attend("ana", "sales");
    sell();
    expect(notices()).toHaveLength(1);
    expect(ana().attention.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    rig.act("ana", "unattend", { target: "sales" });
    sell();
    expect(ana().attention.has("sales")).toBe(true);
  });

  it("does not reset the existing ladder when another entry arrives", () => {
    sell();
    vi.advanceTimersByTime(30_000);
    sell();
    expect(notices()).toHaveLength(2);
    vi.advanceTimersByTime(30_000);
    expect(notices()).toHaveLength(3);
    expect(ana().attention.get("sales")?.delay).toBe(120_000);
  });

  it("restores attention, the remaining deadline and attended targets without replaying notices", () => {
    sell();
    vi.advanceTimersByTime(90_000);
    const before = rig.state();
    const facts = rig.facts();
    rig.restart();
    expect(rig.state()).toEqual(before);
    expect(identityView(rig.state(), "beto").attends).toEqual(["sales"]);
    expect(rig.facts()).toEqual(facts);
    vi.advanceTimersByTime(89_999);
    expect(rig.facts()).toEqual(facts);
    vi.advanceTimersByTime(1);
    expect(notices()).toHaveLength(3);
    rig.attend("ana", "sales");
    rig.restart();
    vi.advanceTimersByTime(3_600_000);
    expect(notices()).toHaveLength(3);
    expect(ana().attention.size).toBe(0);
  });

  it("ignores an obsolete wake after attention has been cleared and required again", () => {
    sell();
    const old = rig.facts().find(event => event.kind === "wake-at");
    rig.attend("ana", "sales");
    rig.act("ana", "unattend", { target: "sales" });
    sell();
    const count = notices().length;
    rig.bus.emit(effect("woke", { id: old?.kind === "wake-at" ? old.data.id : "" }, "clock", [old?.id ?? ""]));
    expect(notices()).toHaveLength(count);
  });

  it("stops calling an identity for a tool the admin takes away", () => {
    sell();
    rig.bus.emit(effect("granted", { identity: "ana", tools: ["payments"] }, "ana"));
    expect(ana().attention.size).toBe(0);
    vi.advanceTimersByTime(3_600_000);
    expect(notices()).toHaveLength(1);
  });
});
