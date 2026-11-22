// Review check 2 of house-mind0b (f0d3185), own scripts: a real house (startHouse) and the base's real paths.
import { afterEach, expect, it } from "vitest";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
import { effect } from "../house/facts.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const tick = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));
it("N2 through the clock (a real top-level write): the woke listener opens a together that rolls back", async () => {
  const desk = zeroMind("desk");
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  let heard = "";
  let r: Promise<unknown> | undefined;
  const bus = desk.startup().bus;
  bus.on("wake-at", e => {
    if (e.data.id === "desk:two") {
      heard = e.id;
      r = desk.act();
    }
  });
  bus.on("woke", e => {
    if (e.data.id !== "desk:one") return;
    try {
      bus.together(() => {
        bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:two", at: null } });
        throw new Error("the program changes its mind");
      });
    } catch {
      /* caught */
    }
  });
  bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:one", at: Date.now() + 5 } });
  await tick(80);
  const facts = rig.facts();
  expect(heard).toBe("");
  expect(r).toBeUndefined();
  expect(facts.filter(e => e.kind === "mind-noted" && e.by === "mind:desk")).toEqual([]);
  expect(facts.filter(e => e.kind === "woke")).toHaveLength(1);
});

it("N2 control: the same together from a timer (no delivery in progress)", async () => {
  const desk = zeroMind("desk");
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  let r: Promise<unknown> | undefined;
  const bus = desk.startup().bus;
  bus.on("wake-at", e => {
    if (e.data.id === "desk:two") r = desk.act();
  });
  await new Promise<void>(resolve =>
    setTimeout(() => {
      try {
        bus.together(() => {
          bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:two", at: null } });
          throw new Error("x");
        });
      } catch {
        /* */
      }
      resolve();
    }, 0),
  );
  expect(await r).toMatchObject({ status: "rejected" });
  expect(rig.facts().filter(e => e.kind === "wake-at")).toEqual([]);
});

it("N5program: an inner together caught inside a person's act", () => {
  const desk = zeroMind("desk");
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  const bus = desk.startup().bus;
  let heard = "";
  let r: Promise<unknown> | undefined;
  bus.on("wake-at", e => {
    if (e.data.id === "desk:middle") {
      heard = e.id;
      r = desk.act();
    }
  });
  bus.on("sale-registered", e => {
    if (e.by !== "ana") return;
    try {
      bus.together(() => {
        bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:middle", at: null } });
        bus.emit({ layer: "house", kind: "wake-at", data: { id: "other:foreign", at: null } });
      });
    } catch {
      /* caught */
    }
  });
  rig.attend("ana", "sales");
  const person = rig.act("ana", "register", { sale: "s", total: 1 }, "sales");
  const facts = rig.facts();
  expect(person.status).toBe("accepted");
  expect(heard).toBe("");
  expect(r).toBeUndefined();
  expect(facts.filter(e => e.kind === "wake-at" && e.data.id === "desk:middle")).toEqual([]);
});

it("N5b by the program alone: a nested together from a timer, the inner one fails and is caught", async () => {
  const desk = zeroMind("desk");
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  const bus = desk.startup().bus;
  let heard = "";
  let r: Promise<unknown> | undefined;
  bus.on("wake-at", e => {
    if (e.data.id === "desk:internal") {
      heard = e.id;
      r = desk.act();
    }
  });
  await new Promise<void>(resolve =>
    setTimeout(() => {
      bus.together(() => {
        try {
          bus.together(() => {
            bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:internal", at: null } });
            throw new Error("internal");
          });
        } catch {
          /* the outer one goes on */
        }
        bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:outside", at: null } });
      });
      resolve();
    }, 0),
  );
  const facts = rig.facts();
  expect(heard).not.toBe("");
  expect(facts.filter(e => e.kind === "wake-at" && e.data.id === "desk:internal")).toEqual([]);
  expect(await r).toMatchObject({ status: "rejected" });
  expect(facts.filter(e => e.kind === "wake-at").map(e => e.data.id)).toEqual(["desk:outside"]);
});
