import { expect, it } from "vitest";
import { staged, perform } from "../../checks/promises/promised-stage.ts";
import { identitiesProgram, identitiesShown } from "../../../tests/support/identities-program.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { sceneLimits } from "../../house/own-acts.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { paint, contentRows } from "../../doors/terminal/paint.ts";
const scene = (by: string, identity = by, general = "En curso") => ({
  by,
  act: "scene",
  on: `identities/${identity}`,
  input: { general },
});
it("scene ownership is the same on the surface and execution, including administration", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    for (const by of ["ana", "beto", "carla"]) {
      const core = houseTools(localPorts(house(), by, { recentLines: 20 }), identitiesShown, "es").find(
        t => t.id === "identities",
      );
      expect(core?.actsOn?.scene).toBeDefined();
      for (const identity of ["ana", "beto", "carla"]) {
        expect(core?.actsOn?.scene?.off?.(`identities/${identity}`)).toBe(
          by === identity ? undefined : "solo la escena propia",
        );
        expect((await perform(house(), "identities", scene(by, identity))).status).toBe(
          by === identity ? "accepted" : "rejected",
        );
      }
      if (by !== "ana") expect(core?.acts.new?.off?.()).toBe("solo quien administra");
    }
    expect(house().tools.state().house.scenes.size).toBe(3);
    expect((await perform(house(), "identities", scene("outsider", "beto"))).status).toBe("rejected");
    expect((await perform(house(), "identities", scene("mind:sales", "beto"))).status).toBe("rejected");
  });
});
it("scene boundaries reject before writing; the single question retains the contract's general bound", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    expect((await perform(house(), "identities", scene("beto", "beto", "x".repeat(sceneLimits.general)))).status).toBe(
      "accepted",
    );
    const before = house().tools.state().house.scenes.get("beto");
    for (const text of ["", "   ", "\u200b\u200d\u2060", "x".repeat(sceneLimits.general + 1)])
      expect((await perform(house(), "identities", scene("beto", "beto", text))).status).toBe("rejected");
    expect(house().tools.state().house.scenes.get("beto")).toEqual(before);
    const core = houseTools(localPorts(house(), "beto", { recentLines: 20 }), identitiesShown, "es").find(
      t => t.id === "identities",
    );
    expect(core?.actsOn?.scene?.next([], "identities/beto")).toMatchObject({
      kind: "text",
      ask: "General",
      max: sceneLimits.general,
    });
    expect(core?.actsOn?.scene?.next(["Una escena"], "identities/beto")).toBeNull();
  });
});
it("two authors, replacement, removed readers and reopening preserve scenes without mixing recipients", async () => {
  await staged(identitiesProgram, async ({ house, reopen }) => {
    const results = await Promise.all([
      perform(house(), "identities", scene("beto")),
      perform(house(), "identities", scene("carla")),
    ]);
    expect(results.map(r => r.status)).toEqual(["accepted", "accepted"]);
    expect(
      house().tools.act({ act: "scene", input: { general: "Desde contrato", to: { carla: "Para Carla" } } }, 0, "beto")
        .status,
    ).toBe("accepted");
    const core = () =>
      houseTools(localPorts(house(), "carla", { recentLines: 20 }), identitiesShown, "es").find(
        t => t.id === "identities",
      );
    expect(JSON.stringify(core()?.view("identities/beto"))).toContain("Para Carla");
    await perform(house(), "identities", scene("beto", "beto", "Reemplazada"));
    expect(JSON.stringify(core()?.view("identities/beto"))).not.toContain("Para Carla");
    await perform(house(), "identities", { act: "remove", on: "identities/beto", input: {} });
    expect((await perform(house(), "identities", scene("beto"))).status).toBe("rejected");
    reopen();
    expect(JSON.stringify(core()?.view("identities/beto"))).toContain("Reemplazada");
    expect(house().tools.state().house.scenes.get("carla")?.data.general).toBe("En curso");
  });
});
it("a failed scene write keeps the last whole scene across restart", async () => {
  await staged(identitiesProgram, async ({ house, reopen }) => {
    await perform(house(), "identities", scene("beto"));
    const append = house().journal.append.bind(house().journal);
    house().journal.append = (event, at) => {
      if (event.kind === "scene") throw new Error("simulated cut");
      return append(event, at);
    };
    expect((await perform(house(), "identities", scene("beto", "beto", "No escrita"))).status).toBe("rejected");
    house().journal.append = append;
    reopen();
    expect(house().tools.state().house.scenes.get("beto")?.data.general).toBe("En curso");
  });
});
it("an open scene question loses permission on removal and returns on readmission", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    const core = houseTools(localPorts(house(), "carla", { recentLines: 20 }), identitiesShown, "es").find(
      t => t.id === "identities",
    );
    expect(core?.actsOn?.scene?.next([], "identities/carla")?.kind).toBe("text");
    await perform(house(), "identities", { act: "remove", on: "identities/carla", input: {} });
    expect(await core?.actsOn?.scene?.run(["Abierta antes"], "identities/carla")).toMatchObject({
      ok: false,
      reason: "sin acceso",
    });
    expect(house().tools.state().house.scenes.has("carla")).toBe(false);
    await perform(house(), "identities", { act: "readmit", on: "identities/carla", input: {} });
    expect((await perform(house(), "identities", scene("carla"))).status).toBe("accepted");
  });
});
it("an already open reader sees each new identity and mind scene without recreating the surface", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    const core = houseTools(localPorts(house(), "carla", { recentLines: 20 }), identitiesShown, "es").find(
      t => t.id === "identities",
    );
    for (const general of ["Primera escena", "Última escena"]) {
      expect((await perform(house(), "identities", scene("beto", "beto", general))).status).toBe("accepted");
      expect(
        house().tools.act({ act: "scene", input: { general, to: { carla: "Para Carla" } } }, 0, "mind:sales").status,
      ).toBe("accepted");
      const list = core?.view().flatMap(stack => stack.rows);
      expect(list?.find(row => row.title === "beto")?.detail).toBe(general);
      expect(list?.find(row => row.title === "mente de sales")?.detail).toBe(general);
      expect(JSON.stringify(core?.view("identities/beto"))).toContain(general);
      expect(JSON.stringify(core?.view("identities/mind:sales"))).toContain("Para Carla");
    }
  });
});

it.each([
  { by: "carla", target: "2" },
  { by: "ana", target: "2" },
  { by: "carla", target: "4" },
  { by: "ana", target: "4" },
])("$by reads the whole scene of $target above expanded actions with arrows", async ({ by, target }) => {
  await staged(identitiesProgram, async ({ house, reopen }) => {
    const general =
      "Preparando la lectura de la casa con sus identidades y sus herramientas " +
      "para continuar mañana sin perder el contexto completo.";
    for (const by of ["beto", "mind:sales"])
      expect(
        house().tools.act(
          { act: "scene", input: { general, to: { carla: "Revisión para Carla", ana: "Para Ana" } } },
          0,
          by,
        ).status,
      ).toBe("accepted");
    reopen();
    const router = houseRouter(localPorts(house(), by, { recentLines: 40 }), identitiesShown);
    const screen = () =>
      paint(router.screen({ rows: contentRows(40) }), { cols: 100, rows: 40 })
        .map(row => row.map(cell => cell.char).join(""))
        .join("\n");
    try {
      router.send({ kind: "type", text: "i" });
      router.send({ kind: "type", text: target });
      await router.idle();
      const addressed = by === "carla" ? "Revisión para Carla" : "Para Ana";
      for (let moves = 0; moves < 40 && !screen().includes(addressed); moves++) router.send({ kind: "up" });
      expect(screen()).toContain(addressed);
      expect(screen()).toContain("contexto completo.");
      expect(screen()).toContain("Preparando la lectura");
      expect(screen()).not.toContain(by === "carla" ? "Para Ana" : "Revisión para Carla");
    } finally {
      router.stop();
    }
  });
});
