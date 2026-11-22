import { expect, it } from "vitest";
import { staged, perform } from "./promised-stage.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { kitBoundary, boundaryShown } from "../../../tests/support/kit-boundary.ts";
import { kitProgram, kitShown } from "../../../tests/support/kit-program.ts";
it("an empty action catalog offers the identity's whole tool and shows an empty mind without debt", async () => {
  await staged(kitBoundary(0), async ({ house }) => {
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), boundaryShown).find(
      tool => tool.id === "identities",
    );
    expect(core?.view("identities/mind:sales")[0]).toEqual({ title: "sales", rows: [], empty: "Sin acciones." });
    expect(core?.view("identities/mind:sales").at(-1)?.rows).toHaveLength(1);
    expect(
      (
        await perform(house(), "identities", {
          act: "kit:sales",
          on: "identities/carla",
          input: { value: "yes" },
        })
      ).status,
    ).toBe("accepted");
    expect(core?.view("identities/carla#tools")[0]?.rows[0]?.detail).toBe("Todo, también lo nuevo");
    expect(
      (
        await perform(house(), "identities", {
          act: "kit:sales",
          on: "identities/carla",
          input: { value: "no" },
        })
      ).status,
    ).toBe("accepted");
    expect(core?.view("identities/carla#tools")[0]?.rows[0]?.detail).toBe("Sin acciones");
  });
});
it("nine and ten mind actions remain reachable with an explicit folder row", async () => {
  for (const count of [9, 10])
    await staged(kitBoundary(count), ({ house }) => {
      const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), boundaryShown).find(
        tool => tool.id === "identities",
      );
      const stacks = core?.view("identities/mind:sales#kit:sales/sales");
      const rows = stacks?.flatMap(stack => stack.rows);
      expect(rows).toHaveLength(count + 1);
      expect(rows?.some(row => row.key === "t")).toBe(true);
      expect(JSON.stringify(stacks)).not.toContain("menú pendiente");
      return Promise.resolve();
    });
});
it("every open reader sees identity and mind data change, including the direct object reading", async () => {
  await staged(kitProgram, async ({ house }) => {
    const readers = ["ana", "beto", "carla"].map(by =>
      houseTools(localPorts(house(), by, { recentLines: 20 }), kitShown).find(tool => tool.id === "identities"),
    );
    for (const value of ["yes", "no"]) {
      for (const on of ["identities/carla", "identities/mind:sales"])
        expect((await perform(house(), "identities", { act: "kit:sales:register", on, input: { value } })).status).toBe(
          "accepted",
        );
      for (const core of readers) {
        expect(core?.view("identities/carla#tools")[0]?.rows[0]?.detail).toBe(
          value === "yes" ? "Algunas acciones" : "Sin acciones",
        );
        expect(core?.view().find(stack => stack.title === "Mentes")?.rows[0]?.detail).toBe(
          value === "yes" ? "Algunas acciones" : "Sin acciones",
        );
      }
      const declared = house().registry.find(tool => tool.id === "identities");
      const reading: unknown = JSON.parse(
        declared?.view(house().tools.state(), "identities/mind:sales", { recentLines: 20, now: 0 }) ?? "null",
      );
      expect(reading).toEqual({
        identifier: "mind:sales",
        name: "mente de sales",
        state: value === "yes" ? "Algunas acciones" : "Sin acciones",
        kit: [`registrar · ${value === "yes" ? "sí" : "no"}`, "esperar · no"],
      });
    }
  });
});

it("unknown or foreign mind menus never offer a kit edit", async () => {
  await staged(kitProgram, ({ house }) => {
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), kitShown).find(
      tool => tool.id === "identities",
    );
    for (const target of [
      "identities/mind:invented",
      "identities/mind:sales#tools",
      "identities/mind:sales#kit:payments",
      "identities/invented#tools",
    ])
      expect(() => core?.view(target)).toThrow();
    expect(
      core
        ?.view("identities/mind:sales#kit:sales/sales")
        .at(-1)
        ?.rows.map(row => row.key),
    ).toEqual(["t", "1", "2"]);
    return Promise.resolve();
  });
});
it("identities and minds both receive the ninth action through a navigable tool folder", async () => {
  await staged(kitBoundary(9), async ({ house }) => {
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), boundaryShown).find(
      tool => tool.id === "identities",
    );
    expect(core?.view("identities/carla#tools")[0]?.rows[0]?.opens).toBe("identities/carla#kit:sales");
    expect(core?.view("identities/carla#kit:sales")[0]?.rows[0]?.opens).toBe("identities/carla#kit:sales/sales");
    expect(
      (
        await perform(house(), "identities", {
          act: "kit:sales:action8",
          on: "identities/carla",
          input: { value: "yes" },
        })
      ).status,
    ).toBe("accepted");
    expect(
      (
        await perform(house(), "identities", {
          act: "kit:sales:action8",
          on: "identities/mind:sales",
          input: { value: "yes" },
        })
      ).status,
    ).toBe("accepted");
  });
});
