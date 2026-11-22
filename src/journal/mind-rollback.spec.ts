// Revisión 2 de casa-mente0b: ¿el control de la causa escrita se equivoca? Se copia a src/tools/boundaries/.
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

it("cola: un together deshecho durante una entrega no llega a la mente", async () => {
  const { rig, desk } = opened();
  let heardId = "";
  let once = 0;
  const results: unknown[] = [];
  // la mente de desk actúa cada vez que oye su propio wake-at (cualquier programa podría oír así)
  desk.startup().bus.on("wake-at", e => {
    if (e.data.id === "desk:two") {
      heardId = e.id;
      results.push(desk.act());
    }
  });
  // al oír un estímulo de la casa (entregado fuera de toda transacción), el programa pide dos despertares juntos;
  // el segundo es ajeno y se rechaza, así que el together se deshace entero
  desk.startup().bus.on("stimulus", () => {
    if (once++) return;
    try {
      desk.startup().bus.together(() => {
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:two", at: Date.now() + 5 } });
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "other:zero", at: null } });
      });
    } catch {
      /* el programa atrapa el rechazo */
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
it("reloj: un despertar deshecho no arma el reloj ni hace actuar a la mente", async () => {
  const { rig, desk } = opened();
  let once = 0;
  desk.startup().bus.on("stimulus", () => {
    if (once++) return;
    try {
      desk.startup().bus.together(() => {
        desk.schedule(Date.now() + 5); // desk:zero, el despertar que zeroMind atiende
        throw new Error("el programa se arrepiente");
      });
    } catch {
      /* atrapado */
    }
  });
  rig.bus.emit(effect("stimulus", { tool: "desk" }, "shop"));
  await tick(80);
  expect(desk.pending).toEqual([]);
  expect(rig.facts().filter(e => e.kind === "wake-at" && e.data.id === "desk:zero")).toEqual([]);
  expect(rig.facts().filter(e => e.kind === "woke" || e.kind === "mind-noted")).toEqual([]);
  expect(rig.state().wakeOwners.has("desk:zero")).toBe(false);
});
it("anidado plano: un together interno que falla y se atrapa no se deshace, pero el acto se rechaza", async () => {
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
      /* el de afuera sigue */
    }
  });
  const r = await pending;
  expect(has(rig, stim)).toBe(false);
  expect(r).toMatchObject({ status: "rejected" });
});
it("continuación: transacción A confirmada, B posterior se deshace; el pedido nacido en A", async () => {
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
      throw new Error("B se deshace");
    });
  } catch {
    /* */
  }
  expect(await pending).toStrictEqual({ status: "accepted" });
});
it("fuera de todo oyente mientras otra escritura se deshace", async () => {
  const { rig, desk } = opened();
  let pending: Promise<unknown> | undefined;
  try {
    rig.bus.together(() => {
      rig.bus.emit(effect("stimulus", { tool: "x" }, "shop"));
      pending = desk.act(); // llamado desde código ajeno, sin oír nada
      throw new Error("se deshace");
    });
  } catch {
    /* */
  }
  const timerResult = await new Promise(resolve => setTimeout(() => resolve(desk.act()), 0));
  expect(await pending).toMatchObject({ status: "rejected" });
  expect(timerResult).toStrictEqual({ status: "accepted" });
});
it("dos casas en el mismo proceso: el oyente de una pide en la otra", async () => {
  const a = opened();
  const b = opened();
  let pending: Promise<unknown> | undefined;
  a.desk.startup().bus.on("stimulus", () => {
    pending = b.desk.act();
  });
  try {
    a.rig.bus.together(() => {
      a.rig.bus.emit(effect("stimulus", { tool: "x" }, "shop"));
      throw new Error("A se deshace");
    });
  } catch {
    /* */
  }
  const r = await pending;
  const cause = b.rig.facts().find(e => e.kind === "act")?.cause;
  expect(r).toStrictEqual({ status: "accepted" });
  expect(cause).toEqual([]);
});
it("planoPrograma: el together fallido dentro de un acto no queda escrito", () => {
  const { rig, desk } = opened();
  let caught = "";
  desk.startup().bus.on("sale-registered", e => {
    if (e.by !== "ana") return;
    try {
      desk.startup().bus.together(() => {
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:middle", at: null } });
        desk.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "other:ajeno", at: null } });
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
