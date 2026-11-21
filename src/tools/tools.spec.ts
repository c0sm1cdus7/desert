// Attention is a tool-wide call made once per entry, the same for every identity of the house, and no clock repeats it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { identityView } from "../house/members.ts";
import { effect } from "../house/facts.ts";
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
  it("calls once when the entry is written and never again by the clock (21/11)", () => {
    expect(sell().status).toBe("accepted");
    expect(notices()).toHaveLength(1);
    expect(ana().attention.has("sales")).toBe(true);
    expect(rig.facts().filter(event => event.kind === "wake-at")).toEqual([]);
    vi.advanceTimersByTime(48 * 3_600_000);
    expect(notices()).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
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

  it("clears the whole tool on attending it", () => {
    sell();
    vi.advanceTimersByTime(60_000);
    rig.attend("ana", "sales/s1");
    expect(ana().attention.size).toBe(0);
    vi.advanceTimersByTime(8 * 3_600_000);
    expect(notices()).toHaveLength(1);
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

  it("tells every new entry while it calls, without a second call", () => {
    const first = sell();
    sell();
    expect(notices()).toHaveLength(2);
    expect(rig.facts().filter(event => event.kind === "attention" && event.by === "ana")).toHaveLength(1);
    expect(ana().attention.get("sales")?.since).toBeDefined();
    expect(first.status).toBe("accepted");
  });

  it("restores attention and attended targets without replaying notices", () => {
    sell();
    const before = rig.state();
    const facts = rig.facts();
    rig.restart();
    expect(rig.state()).toEqual(before);
    expect(identityView(rig.state(), "beto").attends).toEqual(["sales"]);
    vi.advanceTimersByTime(3_600_000);
    expect(rig.facts()).toEqual(facts);
  });

  it("a reminder armed before 21/11 re-arms nothing: no timer, no woke, no notice, and the call still ends", () => {
    const id = 'attention:["ana","sales"]';
    const old = rig.bus.emit(effect("attention", { tool: "sales", delay: 60_000 }, "ana"));
    rig.bus.emit(effect("wake-at", { id, at: 60_000 }, "ana", [old.id]));
    expect(ana().attention.has("sales")).toBe(true);
    rig.restart();
    vi.advanceTimersByTime(8 * 3_600_000);
    expect(rig.facts().filter(event => event.kind === "woke")).toEqual([]);
    rig.bus.emit(effect("woke", { id }, "clock", [old.id]));
    expect(notices()).toHaveLength(0);
    expect(rig.facts().filter(event => event.kind === "wake-at")).toHaveLength(1);
    rig.attend("ana", "sales");
    expect(ana().attention.size).toBe(0);
  });

  it("calls nobody for an entry written only for the record", () => {
    rig.bus.emit(
      effect("tool-entry", { tool: "sales", target: "sales", author: "beto", text: "Kept", silent: true }, "beto"),
    );
    expect(notices()).toHaveLength(0);
    expect(ana().attention.size).toBe(0);
    expect(ana().entries.map(entry => entry.data.text)).toEqual(["Kept"]);
    sell();
    expect(notices()).toHaveLength(1);
  });

  it("stops calling an identity for a tool the admin takes away", () => {
    sell();
    rig.bus.emit(effect("granted", { identity: "ana", tools: ["payments"] }, "ana"));
    expect(ana().attention.size).toBe(0);
    vi.advanceTimersByTime(3_600_000);
    expect(notices()).toHaveLength(1);
  });
});
