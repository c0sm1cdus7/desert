// The union of Identities (5a–5d) with the kit repairs (6a–6c), on the real core piece through startHouse.
import { effectiveKit } from "../../house/kit.ts";
import { expect, it } from "vitest";
import { perform, staged } from "../../checks/promises/promised-stage.ts";
import { keysTo, seated, type } from "../../checks/promises/promised-keys.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { kitAct } from "./kit-catalog.ts";
import { identityTarget } from "./identity-reading.ts";
import { kitProgram, kitShown } from "../../../tests/support/kit-program.ts";
const powers = new Set(["granted", "removed", "handed", "kit-set", "named", "scene"]);
/** The facts only the house writes: none may appear for an act it refused. */
const facts = (
  house: () => { journal: { replay: <S>(initial: S, step: (state: S, event: { kind: string }) => S) => S } },
) => house().journal.replay(0, (count, event) => count + Number(powers.has(event.kind)));

it("personal scene and assistant delegation keep their rules; administrative actions say why", async () => {
  await staged(kitProgram, async ({ house }) => {
    const acts = Object.keys(house().registry.find(tool => tool.id === "identities")?.acts ?? {});
    expect(acts.length).toBeGreaterThan(5);
    for (const act of acts.filter(each => each !== "scene" && each !== "new")) {
      const before = facts(house);
      const done = await perform(house(), "identities", { by: "beto", on: identityTarget("beto"), act, input: {} });
      const ownedDevice = ["register-device", "accept-device", "retire-device"].includes(act);
      const refused = ownedDevice ? toolTexts.invalid : toolTexts.kitRefusal("identities");
      expect([act, done.status, done.reason]).toEqual([
        act,
        "rejected",
        act === "delegate-assistant" ? "asistente sin habilitar" : refused,
      ]);
      expect(facts(house)).toBe(before);
    }
    const created = await perform(house(), "identities", {
      by: "beto",
      act: "new",
      input: { identity: "luz", tools: [] },
    });
    expect([created.status, created.reason]).toEqual(["rejected", words.only]);
    const own = { general: "Estoy probando" };
    expect(
      (await perform(house(), "identities", { by: "beto", on: identityTarget("beto"), act: "scene", input: own }))
        .status,
    ).toBe("accepted");
    for (const by of ["beto", "ana"]) {
      const other = await perform(house(), "identities", { by, on: identityTarget("carla"), act: "scene", input: own });
      expect([by, other.status, other.reason]).toEqual([by, "rejected", words.ownScene]);
    }
    expect([...house().tools.state().house.scenes.keys()]).toEqual(["beto"]);
  });
});

it("kits given from Identities pass the house's kit validation; removed and admin rows offer none", async () => {
  await staged(kitProgram, async ({ house }) => {
    const give = (holder: string, act: string, value: "yes" | "no") =>
      perform(house(), "identities", { on: identityTarget(holder), act: kitAct("sales", act), input: { value } });
    expect((await give("beto", "wait", "no")).status).toBe("accepted");
    const kit =
      effectiveKit(house().tools.state().house, "beto", house().registry).find(item => item.tool === "sales")?.acts ??
      [];
    expect(kit).not.toContain("wait");
    expect(new Set(kit).size).toBe(kit.length);
    expect((await give("mind:sales", "wait", "yes")).status).toBe("accepted");
    expect(
      effectiveKit(house().tools.state().house, "mind:sales", house().registry).find(item => item.tool === "sales")
        ?.acts,
    ).toEqual(["wait"]);
    expect((await give("ana", "wait", "no")).status).toBe("rejected");
    const removed = await perform(house(), "identities", { on: identityTarget("carla"), act: "remove", input: {} });
    expect(removed.status).toBe("accepted");
    expect((await give("carla", "wait", "yes")).status).toBe("rejected");
    expect(house().tools.state().house.kits.has("carla")).toBe(false);
    expect(house().tools.state().house.kits.has("ana")).toBe(false);
  });
});

it("who was removed reads nothing, Identities included, and sends no act; who stays reads it", async () => {
  await staged(kitProgram, async ({ house }) => {
    const before = seated(house(), "carla", kitShown);
    const core = () => before.tools.find(tool => tool.id === "identities");
    expect(core()?.off?.()).toBeUndefined();
    await perform(house(), "identities", { on: identityTarget("carla"), act: "remove", input: {} });
    expect(core()?.off?.()).toBe(toolTexts.unassigned);
    for (const tool of before.tools.filter(each => each.id !== "preferences"))
      expect([tool.id, tool.notices?.().news ?? []]).toEqual([tool.id, []]);
    const acts = () =>
      house().journal.replay(0, (n, event) => n + Number(event.kind === "act" && event.by === "carla"));
    const written = acts();
    type(before.router, keysTo(kitShown, "identities"));
    expect(acts()).toBe(written);
    before.router.stop();
    const beto = seated(house(), "beto", kitShown);
    expect(beto.tools.find(tool => tool.id === "identities")?.off?.()).toBeUndefined();
    beto.router.stop();
  });
});

it("removing an action from Identities cuts the act that was running with it", async () => {
  await staged(kitProgram, async ({ house }) => {
    house().tools.act({ act: "attend", input: { target: "sales" } }, 0, "beto");
    const running = house().tools.act({ act: "wait", target: "sales", input: {} }, 0, "beto");
    expect(running.status).toBe("processing");
    const removed = await perform(house(), "identities", {
      on: identityTarget("beto"),
      act: kitAct("sales", "wait"),
      input: { value: "no" },
    });
    expect(removed.status).toBe("accepted");
    const done = running.status === "processing" ? await running.completion : running;
    expect([done.status, done.reason]).toEqual(["interrupted", toolTexts.withdrawn]);
  });
});
