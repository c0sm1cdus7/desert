// Whole tools are the only assignment unit, the admin alone assigns them, and a channel is read by its members.
import { afterEach, describe, expect, it } from "vitest";
import { allowed, assigned, channelFor, hides, houseChannel, identityView, inChannel, visible } from "./house.ts";
import { effect } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop } from "../../tests/support/shop.ts";

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

  it("creates the house once: a second creation changes neither the admin nor the grants", () => {
    const rig = open();
    rig.bus.emit(effect("house-created", {}, "beto"));
    expect(rig.state().house.admin).toBe("ana");
    expect([...rig.state().house.grants.keys()]).toEqual(["ana", "beto"]);
  });

  it("puts every identity of the house in the house channel, in a stable order", () => {
    const rig = open();
    grant(rig, "ana", "aaron", []);
    expect(rig.state().house.channels.get(houseChannel)).toEqual(["aaron", "ana", "beto"]);
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

describe("a house's channels", () => {
  it("names a channel by its members, whoever creates it and in whatever order", () => {
    const rig = open({ grants: { ana: [], beto: [], carla: [] } });
    const house = rig.state().house;
    const channel = channelFor(house, "beto", ["beto", "ana", "ana"]);
    expect(channel?.members).toEqual(["ana", "beto"]);
    expect(channelFor(house, "ana", ["ana", "beto"])?.id).toBe(channel?.id);
    expect(channelFor(house, "carla", ["ana", "beto"])).toBeUndefined();
    expect(channelFor(house, "ana", ["ana", "nobody"])).toBeUndefined();
    rig.bus.emit(effect("channel-created", { channel: channel?.id ?? "", members: ["ana", "beto"] }, "ana"));
    rig.bus.emit(effect("channel-created", { channel: "communicator/made-up", members: ["ana", "carla"] }, "ana"));
    expect([...rig.state().house.channels.keys()]).toEqual([houseChannel, channel?.id]);
    expect(channelFor(rig.state().house, "beto", channel?.id ?? "")?.members).toEqual(["ana", "beto"]);
  });

  it("lets only a channel's members read what happens in it", () => {
    const rig = open({ grants: { ana: ["sales"], beto: ["sales"], carla: ["sales"] } });
    const { id = "" } = channelFor(rig.state().house, "ana", ["ana", "beto"]) ?? {};
    rig.bus.emit(effect("channel-created", { channel: id, members: ["ana", "beto"] }, "ana"));
    const said = rig.bus.emit(effect("tool-entry", { tool: "sales", target: id, author: "ana", text: "Hi" }, "ana"));
    const done = rig.bus.emit(effect("act-done", { object: id, act: "send", text: "Hi" }, "ana"));
    const house = rig.state().house;
    expect(["ana", "beto", "carla"].map(by => visible(house, said, by))).toEqual([true, true, false]);
    expect(["ana", "beto", "carla"].map(by => visible(house, done, by))).toEqual([true, true, false]);
    expect(inChannel(house, "communicator/unknown", "ana")).toBe(false);
    expect(inChannel(house, "sales/s1", "carla")).toBe(true);
    expect(identityView(rig.state(), "carla").entries).toEqual([]);
    expect(identityView(rig.state(), "beto").entries).toEqual([said]);
    const fact = rig.bus.emit(shop.fact("sale-registered", { sale: "s1", total: 1 }, "ana"));
    expect(visible(house, fact, "carla")).toBe(true);
  });
});
