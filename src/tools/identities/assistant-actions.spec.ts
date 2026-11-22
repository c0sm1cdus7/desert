import { explicitKit } from "../../house/kit-selection.ts";
import { expect, it } from "vitest";
import { staged, perform } from "../../checks/promises/promised-stage.ts";
import { shopProgram } from "../../../tests/support/shop.ts";
import { effect } from "../../house/facts.ts";
const program = { ...shopProgram, identities: true };
const on = "identities/beto";
const enable = { act: "enable-assistant", on, input: { name: "Nora" } };
const kit = [{ tool: "sales", acts: ["register"] }];
const domain = (effects: readonly { kind: string }[]) => effects.filter(e => e.kind.startsWith("assistant-"));
it("the different admin enables and only the holder delegates", async () => {
  await staged(program, async ({ house, reopen }) => {
    expect(await perform(house(), "identities", enable)).toMatchObject({ status: "accepted" });
    expect(house().tools.state().house.assistants.get("beto")).toMatchObject({ name: "Nora", kit: [] });
    for (const by of ["ana", "carla"])
      expect(await perform(house(), "identities", { act: "delegate-assistant", on, by, input: { kit } })).toMatchObject(
        { status: "rejected", reason: "solo el titular del asistente" },
      );
    const done = await perform(house(), "identities", { act: "delegate-assistant", on, by: "beto", input: { kit } });
    expect(done).toMatchObject({ status: "accepted" });
    expect(domain(done.effects)).toMatchObject([
      { kind: "assistant-kit-set", by: "beto", data: { version: 2, owner: "beto", kit: explicitKit(kit) } },
    ]);
    reopen();
    expect(house().tools.state().house.assistants.get("beto")?.selections).toEqual(explicitKit(kit));
  });
});
it("refuses a delegation without permission, missing, repeated or of Identities, keeping the kit", async () => {
  await staged(program, async ({ house }) => {
    await perform(house(), "identities", enable);
    for (const bad of [
      [{ tool: "missing", acts: ["register"] }],
      [{ tool: "sales", acts: ["missing"] }],
      [{ tool: "identities", acts: ["new"] }],
      [...kit, ...kit],
    ]) {
      const done = await perform(house(), "identities", {
        act: "delegate-assistant",
        on,
        by: "beto",
        input: { kit: bad },
      });
      expect(done.status).toBe("rejected");
      expect(domain(done.effects)).toEqual([]);
    }
    house().bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"));
    const done = await perform(house(), "identities", { act: "delegate-assistant", on, by: "beto", input: { kit } });
    expect(done).toMatchObject({ status: "rejected", reason: "el titular no tiene ese acto" });
    expect(house().tools.state().house.assistants.get("beto")?.kit).toEqual([]);
  });
});
it("disabling keeps the name, empties the kit and enabling again does not bring it back", async () => {
  await staged(program, async ({ house, reopen }) => {
    await perform(house(), "identities", enable);
    await perform(house(), "identities", { act: "delegate-assistant", on, by: "beto", input: { kit } });
    expect(await perform(house(), "identities", { act: "disable-assistant", on, input: {} })).toMatchObject({
      status: "accepted",
    });
    reopen();
    expect(house().tools.state().house.assistants.get("beto")).toMatchObject({ name: "Nora", enabled: false, kit: [] });
    expect(
      await perform(house(), "identities", { act: "delegate-assistant", on, by: "beto", input: { kit } }),
    ).toMatchObject({ status: "rejected" });
    await perform(house(), "identities", enable);
    expect(house().tools.state().house.assistants.get("beto")?.kit).toEqual([]);
  });
});
it("repetitions emit no assistant facts and do not rename an enabled one", async () => {
  await staged(program, async ({ house }) => {
    await perform(house(), "identities", enable);
    const same = await perform(house(), "identities", enable);
    expect(same.status).toBe("accepted");
    expect(domain(same.effects)).toEqual([]);
    expect(await perform(house(), "identities", { ...enable, input: { name: "Otra" } })).toMatchObject({
      status: "rejected",
    });
    for (let i = 0; i < 2; i++) {
      const result = await perform(house(), "identities", {
        act: "delegate-assistant",
        on,
        by: "beto",
        input: { kit },
      });
      expect(result.status).toBe("accepted");
      expect(domain(result.effects)).toHaveLength(i === 0 ? 1 : 0);
    }
  });
});
it("no mind or member administers assistants, and missing arguments are named", async () => {
  await staged(program, async ({ house }) => {
    for (const by of ["beto", "carla", "mind:sales", "assistant:beto"])
      expect((await perform(house(), "identities", { ...enable, by })).status).toBe("rejected");
    for (const act of ["enable-assistant", "delegate-assistant", "adopt-assistant"])
      expect((await perform(house(), "identities", { act, on, input: {} })).status).toBe("rejected");
    expect(house().tools.state().house.assistants.size).toBe(0);
  });
});
