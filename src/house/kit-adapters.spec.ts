// Guion fijo del revisor de la unión: holds no cambia; la revocación del acto sí corta sus adaptadores.
import { Type } from "@sinclair/typebox";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { adapterProgram, imported, signer } from "../../tests/support/declared-adapters.ts";
import { fakeKeychain } from "../../tests/support/fake-keychain.ts";
import "../../tests/support/fixture-vault.ts";
import { deferred, settled } from "../../tests/support/kit-running.ts";
import { MacOSHouseKeys } from "../../tests/support/retired-macos/macos-house-keys.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "../../tests/support/shop.ts";
import { startHouse } from "../runtime/house-runtime.ts";
import { toolAct } from "../tools/act-definition.ts";
import type { Tool } from "../tools/tool-contract.ts";
import { effect } from "./facts.ts";
import { holds, mindOf } from "./kit.ts";
import { emptyHouse } from "./members.ts";

const close: (() => void)[] = [];
afterEach(() => close.splice(0).forEach(stop => stop()));
it("holds: mente propia y existente; identidad con herramienta aunque su kit esté vacío", () => {
  const registry = [{ id: "vault" }, { id: "sales" }];
  const house = {
    ...emptyHouse,
    admin: "ana",
    grants: new Map([
      ["ana", ["sales"]],
      ["beto", ["vault"]],
      ["mind:viejo", ["vault"]],
    ]),
    kits: new Map([["beto", new Map([["vault", []]])]]),
  };
  expect([
    holds(registry, house, mindOf("vault"), "sales"),
    holds(registry, house, mindOf("vault"), "vault"),
    holds(registry, house, mindOf("gone"), "gone"),
    holds(registry, house, "carla", "vault"),
    holds(registry, house, "ana", "vault"),
    holds(registry, house, "beto", "vault"),
    holds(registry, house, "mind:viejo", "vault"),
    holds(registry, house, "mind:", "vault"),
  ]).toEqual([false, true, false, false, false, true, false, false]);
});

function opened(pauseAt: "act" | "adapter" | "output" = "act") {
  const gate = deferred<undefined>();
  const used = vi.fn();
  const empty = Type.Object({});
  const vault: Tool<Shop> = {
    id: "vault",
    purpose: "Prueba sintética",
    targets: () => [],
    summary: () => "",
    view: () => "",
    acts: {
      sign: toolAct(empty, async (_, context) => ({
        status: "accepted",
        text: "Firmado",
        effects: [context.credentials.replace("signing", await imported(context), 0)],
      })),
      slowUse: toolAct(empty, async (_, context) => {
        const current = context.credentials.current("signing");
        const inspect = context.ports.signer?.inspect;
        if (!current || !inspect) throw new Error("Falta la firma sintética");
        if (pauseAt === "act") await gate.promise;
        await inspect(current.refs);
        return { status: "accepted", text: "Usada" };
      }),
    },
  };
  const home = mkdtempSync(join(tmpdir(), "kit-adapters-"));
  const house = startHouse(home, {
    by: "shop",
    projectionVersion: "kit-cut/1",
    words: shop,
    slices: shopSlices,
    registry: [...shopRegistry, vault],
    creation: { admin: "ana", assignments: [{ identity: "beto", tools: ["vault"] }] },
    ...adapterProgram,
    adapters: {
      signer: {
        ...signer,
        open: resolver => {
          const methods = signer.open({
            ...resolver,
            use: (refs, body) =>
              resolver.use(refs, material => {
                used();
                return body(material);
              }),
          });
          return {
            ...methods,
            inspect: async input => {
              if (pauseAt === "adapter") await gate.promise;
              const result = await methods.inspect?.(input);
              if (pauseAt === "output") {
                await gate.promise;
                return { valid: "inválida" };
              }
              return result;
            },
          };
        },
      },
    },
    secretKeys: new MacOSHouseKeys(fakeKeychain().command),
  });
  close.push(() => {
    house.close();
    rmSync(home, { recursive: true, force: true });
  });
  const act = (by: string, act: string) => house.tools.act({ act, target: "vault", input: {} }, 0, by);
  house.tools.act({ act: "attend", input: { target: "vault" } }, 0, "beto");
  house.bus.emit(effect("kit-set", { holder: "mind:vault", tool: "vault", acts: null }, "ana"));
  return { house, act, gate, used };
}

it.each([
  ["beto", "kit"],
  ["mind:vault", "kit"],
  ["beto", "tool"],
  ["beto", "removed"],
])("%s pierde %s: no usa el adaptador guardado y termina sacada, sin falla de la base", async (by, loss) => {
  const { house, act, gate, used } = opened();
  expect(await settled(act(by, "sign"))).toMatchObject({ status: "accepted" });
  const pending = act(by, "slowUse");
  expect(pending.status).toBe("processing");
  if (loss === "kit") house.bus.emit(effect("kit-set", { holder: by, tool: "vault", acts: [] }, "ana"));
  if (loss === "tool") house.bus.emit(effect("granted", { identity: by, tools: [] }, "ana"));
  if (loss === "removed") house.bus.emit(effect("removed", { identity: by }, "ana"));
  gate.resolve(undefined);
  expect(await settled(pending)).toMatchObject({ status: "interrupted", reason: "sacada", effects: [] });
  expect(used).not.toHaveBeenCalled();
  expect(act(by, "slowUse")).toMatchObject({
    status: "rejected",
    reason: loss === "removed" ? "sin acceso" : "fuera del kit",
  });
  expect(house.tools.state().entries.some(entry => entry.data.text.includes("E-BASE"))).toBe(false);
});

it.each(["beto", "mind:vault"])("%s conserva su acción: usa los métodos de su herramienta", async by => {
  const { house, act, gate, used } = opened();
  await settled(act(by, "sign"));
  const pending = act(by, "slowUse");
  house.bus.emit(effect("kit-set", { holder: by, tool: "vault", acts: ["slowUse"] }, "ana"));
  gate.resolve(undefined);
  expect(await settled(pending)).toMatchObject({ status: "accepted" });
  expect(used).toHaveBeenCalledTimes(1);
});

it.each(["beto", "mind:vault"])("%s pierde la acción con el adaptador pendiente antes de usar material", async by => {
  const { house, act, gate, used } = opened("adapter");
  await settled(act(by, "sign"));
  const pending = act(by, "slowUse");
  house.bus.emit(effect("kit-set", { holder: by, tool: "vault", acts: [] }, "ana"));
  house.bus.emit(effect("kit-set", { holder: by, tool: "vault", acts: null }, "ana"));
  gate.resolve(undefined);
  const result = await settled(pending);
  expect(result).toMatchObject({ status: "interrupted", reason: "sacada" });
  expect(result.defect).toBeUndefined();
  expect(house.tools.state().entries.some(entry => entry.data.diagnostic)).toBe(false);
  expect(used).not.toHaveBeenCalled();
});

it.each([false, true])("el rechazo de salida del adaptador conserva defecto solo sin corte: corte=%s", async cut => {
  const { house, act, gate, used } = opened("output");
  await settled(act("beto", "sign"));
  const pending = act("beto", "slowUse");
  expect(used).toHaveBeenCalledTimes(1);
  if (cut) house.bus.emit(effect("kit-set", { holder: "beto", tool: "vault", acts: [] }, "ana"));
  gate.resolve(undefined);
  const result = await settled(pending);
  expect(result.status).toBe(cut ? "interrupted" : "rejected");
  expect(result.defect === true).toBe(!cut);
  expect(house.tools.state().entries.some(entry => entry.data.diagnostic)).toBe(!cut);
});
