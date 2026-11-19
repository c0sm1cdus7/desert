// Addressed scenes keep the core's bound without losing existing parts or publishing a malformed fact.
import { expect, it } from "vitest";
import { shopProgram } from "../../../tests/support/shop.ts";
import { effect } from "../../house/facts.ts";
import { sceneLimits } from "../../house/own-acts.ts";
import { staged, perform } from "../../checks/promises/promised-stage.ts";
import { personalTexts } from "../../texts/personal.texts.ts";
it("allows replacing a full scene's part and refuses one more recipient before writing", async () => {
  await staged(shopProgram, async ({ house }) => {
    const names = Array.from({ length: sceneLimits.identities + 1 }, (_, n) => `member-${n}`);
    for (const identity of names) house().bus.emit(effect("granted", { identity, tools: [] }, "ana"));
    const parts = Object.fromEntries(names.slice(0, sceneLimits.identities).map(name => [name, "Parte"]));
    house().bus.emit(effect("scene", { general: "Escena", to: parts }, "beto"));
    const action = (recipient: string) =>
      perform(house(), "personal", {
        by: "beto",
        act: "addressed",
        input: { recipient, message: "Actualizada" },
      });
    const accepted = await action("member-0");
    expect(accepted.status).toBe("accepted");
    const before = house().tools.state().house.scenes.get("beto");
    expect(await action(`member-${sceneLimits.identities}`)).toMatchObject({
      status: "rejected",
      reason: personalTexts.full,
    });
    expect(house().tools.state().house.scenes.get("beto")).toEqual(before);
    expect(Object.keys(before?.data.to ?? {})).toHaveLength(sceneLimits.identities);
  });
});
