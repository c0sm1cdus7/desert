import "../../tests/support/fixture-vault.ts";
import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { shopProgram, type Shop } from "../../tests/support/shop.ts";
import { adapterProgram, imported, call, synthetic } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "../tools/act-definition.ts";
import type { HouseOptions } from "../house/state.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { startCloudHouse } from "./cloud-house.ts";
import * as opening from "./house-runtime.ts";
import { RootHouseKeys } from "../keychain/cloud/root-house-keys.ts";
const homes: string[] = [],
  stops: (() => void)[] = [];
const program: Omit<HouseOptions<Shop>, "secretKeys"> = {
  ...shopProgram,
  ...adapterProgram,
  by: "shop",
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "vault"] }] },
  registry: [
    ...shopProgram.registry,
    {
      id: "vault",
      purpose: "Prueba sintética",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        save: toolAct(Type.Object({}), async (_, ctx) => ({
          status: "accepted",
          effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
        })),
        use: toolAct(Type.Object({}), async (_, ctx) => {
          const refs = ctx.credentials.current("signing");
          const result = refs ? await call(ctx, "inspect", refs.refs) : undefined;
          return JSON.stringify(result) === JSON.stringify({ valid: true })
            ? { status: "accepted" }
            : { status: "rejected", reason: "Sin material sintético" };
        }),
      },
    },
  ],
};
afterEach(() => {
  stops.splice(0).forEach(stop => stop());
  vi.restoreAllMocks();
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
function home() {
  const path = mkdtempSync(join(tmpdir(), "cloud-house-"));
  homes.push(path);
  return path;
}
function open(path: string) {
  const before = process.listeners("SIGTERM");
  const cloud = startCloudHouse(program, path, { ROOT: Buffer.alloc(32, 71).toString("hex") }, "ROOT");
  const signal = process.listeners("SIGTERM").find(listener => !before.includes(listener));
  if (!signal) throw new Error("fixture signal");
  const stop = () => signal("SIGTERM");
  stops.push(stop);
  return { cloud, stop, ports: cloud.ports("ana", { recentLines: 20 }) };
}
it("abre con startHouse, guarda hechos y secretos sintéticos, cierra desde el anfitrión y reabre", async () => {
  const path = home(),
    start = vi.spyOn(opening, "startHouse"),
    disposed = vi.spyOn(RootHouseKeys.prototype, "dispose");
  const first = open(path);
  expect(start).toHaveBeenCalledTimes(1);
  expect(Object.keys(first.cloud)).toEqual(["ports", "door"]);
  expect(Object.keys(first.cloud.door)).toEqual(["tools", "journal", "bus", "registry", "now"]);
  expect(["close", "stop", "journal", "tools", "bus"].some(name => name in first.ports)).toBe(false);
  await settle(first.ports.act({ act: "attend", input: { target: "vault" } }, 0));
  expect((await settle(first.ports.act({ act: "save", target: "vault", input: {} }, 0))).status).toBe("accepted");
  expect((await settle(first.ports.act({ act: "use", target: "vault", input: {} }, 0))).status).toBe("accepted");
  const through = first.ports.state().through;
  first.stop();
  expect(disposed).toHaveBeenCalledTimes(1);
  first.stop();
  expect(disposed).toHaveBeenCalledTimes(1);
  for (const file of readdirSync(path))
    expect(readFileSync(join(path, file)).includes(Buffer.from(synthetic))).toBe(false);
  const second = open(path);
  expect(second.ports.state().through).toBeGreaterThan(through);
  expect(second.ports.state().house.admin).toBe("ana");
  await settle(second.ports.act({ act: "attend", input: { target: "vault" } }, 0));
  expect((await settle(second.ports.act({ act: "use", target: "vault", input: {} }, 0))).status).toBe("accepted");
});
it("una raíz inválida no abre la casa y una apertura fallida borra la raíz sin instalar señales", () => {
  const start = vi.spyOn(opening, "startHouse"),
    disposed = vi.spyOn(RootHouseKeys.prototype, "dispose");
  const signals = process.listeners("SIGTERM").length;
  expect(() => startCloudHouse(program, home(), {}, "ROOT")).toThrow("ROOT");
  expect(start).not.toHaveBeenCalled();
  expect(() =>
    startCloudHouse(
      { ...program, by: "" },
      home(),
      {
        ROOT: Buffer.alloc(32, 71).toString("hex"),
      },
      "ROOT",
    ),
  ).toThrow();
  expect(disposed).toHaveBeenCalledTimes(1);
  expect(process.listeners("SIGTERM")).toHaveLength(signals);
});
it("conserva un temporizador referenciado sin puertas y borra la raíz de entrada antes de correr", () => {
  const encoded = Buffer.alloc(32, 71).toString("hex");
  const timers = vi.spyOn(globalThis, "setInterval"),
    copies = vi.spyOn(Buffer, "from");
  const before = process.listeners("SIGTERM");
  const path = home(),
    running = open(path);
  const alive = timers.mock.results.find(result => result.type === "return")?.value;
  expect(alive?.hasRef()).toBe(true);
  const input: unknown = copies.mock.results.find(
    (result, index) => result.type === "return" && copies.mock.calls[index]?.[0] === encoded,
  )?.value;
  expect(Buffer.isBuffer(input) && input.every(byte => byte === 0)).toBe(true);
  running.stop();
  expect(process.listeners("SIGTERM")).toEqual(before);
});
