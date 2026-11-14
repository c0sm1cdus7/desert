// Whole tools are the only assignment unit, the admin alone assigns them, and identities read the house.
import { afterEach, describe, expect, it } from "vitest";
import { allowed, assigned, hides } from "./house.ts";
import { effect } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (...args: Parameters<typeof shopRig>) => {
  const rig = shopRig(...args);
  rigs.push(rig);
  return rig;
};
const grant = (rig: ReturnType<typeof shopRig>, by: string, identity: string, tools: string[]) =>
  rig.bus.emit(effect("granted", { identity, tools }, by));

describe("a house's assignments", () => {
  it("records the admin's grants, ignores anyone else's and keeps them across a restart", () => {
    const rig = open({ grants: { ana: ["sales", "payments"], beto: [] } });
    expect(rig.state().house.admin).toBe("ana");
    grant(rig, "beto", "beto", ["payments"]);
    expect(allowed(rig.state().house, "beto", "payments")).toBe(false);
    grant(rig, "ana", "beto", ["sales"]);
    expect(allowed(rig.state().house, "beto", "sales")).toBe(true);
    expect(allowed(rig.state().house, "beto", "payments")).toBe(false);
    expect(assigned(rig.state().house, "beto", ["sales", "payments", "other"])).toEqual(["sales"]);
    rig.restart();
    expect(rig.state().house.grants.get("beto")).toEqual(["sales"]);
  });

  it("takes someone out by the admin's word alone, never the admin itself, and keeps it across a restart", () => {
    const rig = open({ grants: { ana: ["sales"], beto: ["sales"] } });
    rig.bus.emit(effect("removed", { identity: "ana" }, "beto"));
    rig.bus.emit(effect("removed", { identity: "ana" }, "ana"));
    expect([...rig.state().house.grants.keys()]).toEqual(["ana", "beto"]);
    rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
    expect(allowed(rig.state().house, "beto", "sales")).toBe(false);
    expect([...rig.state().house.grants.keys()]).toEqual(["ana"]);
    rig.restart();
    expect(rig.state().house.grants.has("beto")).toBe(false);
    /** Who was taken out comes back the way anyone comes in: the admin gives them tools again. */
    grant(rig, "ana", "beto", ["sales"]);
    expect(allowed(rig.state().house, "beto", "sales")).toBe(true);
  });

  it("passes to another of its identities by the admin's word alone: from then on that one assigns", () => {
    const rig = open({ grants: { ana: ["sales"], beto: [] } });
    rig.bus.emit(effect("handed", { to: "beto" }, "beto"));
    rig.bus.emit(effect("handed", { to: "nobody" }, "ana"));
    expect(rig.state().house.admin).toBe("ana");
    rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
    expect(rig.state().house.admin).toBe("beto");
    grant(rig, "ana", "ana", ["sales", "payments"]);
    expect(allowed(rig.state().house, "ana", "payments")).toBe(false);
    grant(rig, "beto", "ana", ["sales", "payments"]);
    expect(allowed(rig.state().house, "ana", "payments")).toBe(true);
    rig.restart();
    expect(rig.state().house.admin).toBe("beto");
  });

  it("creates the house once: a second creation changes neither the admin nor the grants", () => {
    const rig = open();
    rig.bus.emit(effect("house-created", {}, "beto"));
    expect(rig.state().house.admin).toBe("ana");
    expect([...rig.state().house.grants.keys()]).toEqual(["ana", "beto"]);
  });
});

describe("what each identity prefers not to see", () => {
  it("is said by any member of the house about itself alone, and kept across a restart", () => {
    const rig = open({ grants: { ana: ["sales"], beto: [] } });
    const prefer = (by: string, hide: string, on: boolean) => rig.act(by, "prefer", { hide, on });
    expect([prefer("beto", "off", true), prefer("beto", "foreign", true)].map(done => done.status)).toEqual([
      "accepted",
      "accepted",
    ]);
    expect(prefer("beto", "off", false).status).toBe("accepted");
    expect(rig.state().house.hides).toEqual(new Map([["beto", ["foreign"]]]));
    expect([hides(rig.state().house, "beto", "foreign"), hides(rig.state().house, "ana", "foreign")]).toEqual([
      true,
      false,
    ]);
    expect(prefer("carla", "off", true)).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
    expect(prefer("beto", "everything", true)).toMatchObject({ status: "rejected", reason: toolTexts.invalid });
    rig.bus.emit(effect("preferred", { hide: "off", on: true }, "carla"));
    expect(rig.state().house.hides.has("carla")).toBe(false);
    rig.restart();
    expect(rig.state().house.hides.get("beto")).toEqual(["foreign"]);
  });
});

describe("what each identity last had in front", () => {
  it("is dated by its own attending, never by a process that runs in its name, and kept across a restart", () => {
    const rig = open();
    rig.attend("ana", "sales");
    const first = rig.state().looked.get("ana")?.get("sales") ?? 0;
    expect(first).toBeGreaterThan(0);
    expect([...(rig.state().looked.get("ana")?.keys() ?? [])]).toEqual(["sales"]);
    rig.bus.emit(effect("attended", { target: "sales" }, "ana", [], "process-1"));
    expect(rig.state().looked.get("ana")?.get("sales")).toBe(first);
    rig.attend("ana", "sales");
    expect(rig.state().looked.get("ana")?.get("sales")).toBeGreaterThan(first);
    expect(rig.state().looked.has("beto")).toBe(false);
    const kept = rig.state().looked;
    rig.restart();
    expect(rig.state().looked).toEqual(kept);
  });
});
