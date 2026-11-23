import { expect, it } from "vitest";
import { identitiesProgram, identitiesShown } from "../../../tests/support/identities-program.ts";
import { assigned } from "../../../tests/support/retired-helpers/kit.ts";
import { salesTool, shopProgram, shopShown } from "../../../tests/support/shop.ts";
import { seated, type } from "../../checks/promises/promised-keys.ts";
import { perform, staged } from "../../checks/promises/promised-stage.ts";
import { effect } from "../../house/facts.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { coreRegistry } from "./identities.ts";
const create = (identity: string, name?: string) => ({
  act: "new",
  input: { identity, ...(name === undefined ? {} : { name }), tools: [], language: "es" },
});
it("reserves the registry id, even without the opt-in", () => {
  for (const enabled of [false, true])
    expect(() => coreRegistry([{ ...salesTool, id: "identities" }], "house", enabled)).toThrow("reserved");
  expect(() => coreRegistry(identitiesProgram.registry, "house", false)).toThrow("request");
});
it("all assigned tools excludes the core even for the administrator", async () => {
  await staged(identitiesProgram, ({ house }) => {
    expect(
      assigned(
        house().tools.state().house,
        "ana",
        house().registry.map(tool => tool.id),
      ),
    ).toEqual(["sales", "payments"]);

    return Promise.resolve();
  });
});
it("rejects invisible display names atomically, without a program defect", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    const result = await perform(house(), "identities", create("luz", "\u200b"));
    expect(result).toMatchObject({ status: "rejected", reason: { en: "invalid data", es: "datos inválidos" } });
    expect(result.defect).not.toBe(true);
    expect(house().tools.state().house.grants.has("luz")).toBe(false);
  });
});
it("can create with an empty catalog and accepts identifier boundaries", async () => {
  await staged(
    { ...shopProgram, registry: [], slices: { initial: {}, step: {} }, identities: true },
    async ({ house, reopen }) => {
      for (const identity of ["a", "a".repeat(64), "a.", "a-"])
        expect((await perform(house(), "identities", create(identity))).status).toBe("accepted");
      const tool = houseTools(
        localPorts(house(), "ana", { recentLines: 20 }),
        {
          words: {},
          locale: shopShown.locale,
        },
        "es",
      ).find(tool => tool.id === "identities");
      expect(tool?.acts.new?.next(["sol", ""])).toMatchObject({ kind: "many", options: [] });
      expect((await tool?.acts.new?.run(["sol", "", "", "Español"]))?.ok).toBe(true);
      reopen();
      expect(house().tools.state().house.grants.has("sol")).toBe(true);
    },
  );
});
it("duplicate requests cannot replace a kit or recreate a removed identity", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    const results = await Promise.all([
      perform(house(), "identities", create("luz")),
      perform(house(), "identities", create("luz")),
    ]);
    expect(results.map(result => result.status)).toEqual(["accepted", "rejected"]);
    expect(results[1].reason).toEqual({ en: "existing identity", es: "identidad existente" });
    await perform(house(), "identities", { act: "remove", on: "identities/luz", input: {} });
    expect((await perform(house(), "identities", create("luz"))).reason).toEqual({
      en: "existing identity",
      es: "identidad existente",
    });
  });
});
it("does not trim an invalid identifier entered on the surface", async () => {
  await staged(identitiesProgram, ({ house }) => {
    const seat = seated(house(), "ana", identitiesShown);
    try {
      type(seat.router, "in a");
      seat.router.send({ kind: "confirm" });
      expect(seat.router.screen({ rows: 40 }).body.kind).toBe("thread");
      expect(JSON.stringify(seat.router.screen({ rows: 40 }))).toContain("lowercase ASCII letter");
      expect(house().tools.state().house.grants.has("a")).toBe(false);
    } finally {
      seat.router.stop();
    }

    return Promise.resolve();
  });
});
it("does not normalize a pasted identifier", async () => {
  await staged(identitiesProgram, ({ house }) => {
    for (const text of [" a", "a ", "a\nb", "a\u200b"]) {
      const seat = seated(house(), "ana", identitiesShown);
      try {
        type(seat.router, "in");
        seat.router.send({ kind: "paste", text });
        seat.router.send({ kind: "confirm" });
        expect(JSON.stringify(seat.router.screen({ rows: 40 }))).toContain("lowercase ASCII letter");
        expect(seat.requests.filter(request => request.act === "new")).toEqual([]);
      } finally {
        seat.router.stop();
      }
    }

    return Promise.resolve();
  });
});
it("a question opened by the old administrator cannot write after a handover", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    const tool = houseTools(localPorts(house(), "ana", { recentLines: 20 }), identitiesShown, "es").find(
      tool => tool.id === "identities",
    );
    expect(tool?.acts.new?.next([])?.kind).toBe("text");
    await perform(house(), "identities", { act: "hand", on: "identities/beto", input: {} });
    expect(await tool?.acts.new?.run(["luz", "", "", "Español"])).toMatchObject({
      ok: false,
      reason: "solo quien administra",
    });
    expect(house().tools.state().house.grants.has("luz")).toBe(false);
  });
});
it("a failed name write rolls back the whole creation and reopens without half an identity", async () => {
  await staged(identitiesProgram, async ({ house, reopen }) => {
    const append = house().journal.append.bind(house().journal);
    house().journal.append = (emission, at) => {
      if (emission.kind === "named") throw new Error("simulated disk cut");
      return append(emission, at);
    };
    expect((await perform(house(), "identities", create("luz", "Luz"))).status).toBe("rejected");
    house().journal.append = append;
    reopen();
    expect(house().tools.state().house.grants.has("luz")).toBe(false);
    expect(house().tools.state().house.names.has("luz")).toBe(false);
  });
});
it("the visible name persists and an unnamed identity reads as its identifier", async () => {
  await staged(identitiesProgram, ({ house, reopen }) => {
    house().bus.emit(effect("named", { identity: "beto", name: "Beto 🦫" }, "ana"));
    reopen();
    const tool = houseTools(localPorts(house(), "carla", { recentLines: 20 }), identitiesShown, "es").find(
      tool => tool.id === "identities",
    );
    expect(tool?.titleOf?.("identities/beto")).toBe("Beto 🦫");
    expect(tool?.titleOf?.("identities/ana")).toBe("ana");

    return Promise.resolve();
  });
});
it("rejects an invisible scene atomically, without a program defect, and keeps the scene before it", async () => {
  await staged(identitiesProgram, async ({ house }) => {
    const scene = (general: string) => ({ act: "scene", on: "identities/carla", by: "carla", input: { general } });
    expect(await perform(house(), "identities", scene("En curso"))).toMatchObject({ status: "accepted" });
    const result = await perform(house(), "identities", scene("​"));
    expect(result).toMatchObject({ status: "rejected", reason: { en: "invalid data", es: "datos inválidos" } });
    expect(result.defect).not.toBe(true);
    expect(house().tools.state().house.scenes.get("carla")?.data.general).toBe("En curso");
  });
});
