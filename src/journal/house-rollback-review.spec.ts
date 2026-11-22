// Comprobación 2 de casa-mente0b (f0d3185). Guiones propios: casa real (startHouse) y caminos reales de la base.
import { afterEach, expect, it } from "vitest";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
import { effect } from "../house/facts.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const tick = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));
it("N2 por el reloj (escritura de primer nivel real): el oyente del woke abre un together que se deshace", async () => {
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
        throw new Error("el programa se arrepiente");
      });
    } catch {
      /* atrapado */
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

it("N2 control: el mismo together desde un temporizador (sin entrega en curso)", async () => {
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

it("N5programa: together interno atrapado dentro del acto de una persona", () => {
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
        bus.emit({ layer: "house", kind: "wake-at", data: { id: "other:ajeno", at: null } });
      });
    } catch {
      /* atrapado */
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

it("N5b solo por el programa: together anidado desde un temporizador, el interno falla y se atrapa", async () => {
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
          /* el de afuera sigue */
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
