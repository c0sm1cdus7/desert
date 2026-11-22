import "../../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { shop, shopRegistry, shopSlices, type Shop } from "../../../tests/support/shop.ts";
import { startHouse } from "../house-runtime.ts";
import { toolAct } from "../../tools/act-definition.ts";
import type { Tool } from "../../tools/tool-contract.ts";
import { effect } from "../../house/facts.ts";
import type { ModelHouseOptions } from "./mind-runtime-options.ts";
vi.mock("./mind-runtime.ts", () => {
  throw new Error("Se cargó pensamiento apagado");
});
it.each([undefined, { assistants: false, programs: [] }])(
  "sin pensamiento no carga el runtime y mantiene automatizaciones con sus permisos: %j",
  async minds => {
    const home = mkdtempSync(join(tmpdir(), "mind-disabled-"));
    const run = vi.fn(() => ({ status: "accepted" as const }));
    const results: string[] = [];
    const probe: Tool<Shop> = {
      id: "probe",
      purpose: "Prueba",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: { run: toolAct<Shop, ReturnType<typeof Type.Object>>(Type.Object({}), run) },
      start: ports =>
        ports.bus.on(event => {
          if (event.kind === "scene" && event.by === "ana")
            void ports.act({ act: "run", target: "probe", input: {} }).then(result => {
              results.push(result.status);
            });
        }),
    };
    const options: ModelHouseOptions<Shop> = {
      by: "shop",
      projectionVersion: "off/1",
      words: shop,
      slices: shopSlices,
      registry: [...shopRegistry, probe],
      creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["probe"] }] },
      ...(minds ? { minds } : {}),
    };
    const house = startHouse(home, options);
    try {
      expect(house.minds).toBeUndefined();
      house.bus.emit(effect("scene", { general: "Sin permiso", to: {} }, "ana"));
      await vi.waitFor(() => expect(results).toEqual(["rejected"]));
      expect(run).not.toHaveBeenCalled();
      house.bus.emit(effect("kit-set", { holder: "mind:probe", tool: "probe", acts: ["run"] }, "ana"));
      house.bus.emit(effect("scene", { general: "Con permiso", to: {} }, "ana"));
      await vi.waitFor(() => expect(results).toEqual(["rejected", "accepted"]));
      expect(run).toHaveBeenCalledOnce();
    } finally {
      house.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
);
it.each([
  { minds: { assistants: true, programs: [] } },
  { minds: { assistants: false, programs: ["missing"] } },
  { minds: { assistants: false, programs: ["sales", "sales"] } },
  { identities: true, minds: { assistants: true, programs: [] } },
])("rejects invalid switches before opening the house: %j", changed => {
  const home = mkdtempSync(join(tmpdir(), "mind-invalid-"));
  try {
    expect(() =>
      startHouse(home, {
        by: "shop",
        projectionVersion: "off/1",
        words: shop,
        slices: shopSlices,
        registry: shopRegistry,
        creation: { admin: "ana", assignments: [] },
        ...changed,
      }),
    ).toThrow("minds");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
