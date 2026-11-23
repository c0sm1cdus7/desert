import "../../../tests/support/fixture-vault.ts";
import { said } from "../../fields/phrases.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { compose } from "./compose.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { startHouse, localPorts } from "../house-runtime.ts";
import { requestProgram } from "../../../tests/support/request-program.ts";
import { talkProgram } from "../../../tests/support/talk-program.ts";
import { assistantMindRules } from "../../texts/program-mind.texts.ts";
import { supervisorHouse } from "../../texts/supervisor.texts.ts";
it("derives a mind and opens without a key, with the reason visible", async () => {
  const distribution = compose({ ...sampleOptions, minds: { assistants: false, programs: ["notes"] } });
  expect(distribution.mindDefinitions.map(mind => [mind.actor, mind.role])).toEqual([["mind:notes", "program:notes"]]);
  const modelMinds = await distribution.modelMinds({
    key: () => Promise.resolve(undefined),
    transport: () => Promise.reject(new Error("sin red")),
    account: "test",
    capNanoUsd: 1000000000,
  });
  const home = mkdtempSync(join(tmpdir(), "program-minds-"));
  const house = startHouse(home, {
    ...distribution.program,
    modelMinds,
    by: "test",
    creation: {
      admin: "ana",
      language: "es",
      assignments: [{ identity: "ana", tools: ["notes"], language: "es" }],
    },
  });
  try {
    await (await house.minds)?.flush();
    expect(
      localPorts(house, "ana", { recentLines: 20 })
        .openingNotices?.()
        .map(notice => said(notice, "es"))
        .join(" "),
    ).toContain("llave");
    expect(house.tools.state().house.scenes.get("mind:notes")?.data.general).toContain(
      "The provider's key is missing.",
    );
  } finally {
    house.close();
    rmSync(home, { recursive: true, force: true });
  }
});
it("22/11: each mind knows what wakes it and how it is named; a talking program's mind is not told of its acts", () => {
  const distribution = compose({
    ...sampleOptions,
    programs: [requestProgram(), talkProgram],
    minds: { assistants: false, programs: ["notes", "talk"] },
  });
  const rules = (actor: string) =>
    distribution.mindDefinitions.find(mind => mind.actor === actor)?.rules.text("es", {}) ?? "";
  const threads = (text: string, own: string) => {
    expect(text).toContain("en un hilo individual, cada mensaje despierta al otro");
    expect(text).toContain("en grupo, solo a quien se nombra con @ y el nombre que se ve, como «@Agentes»");
    expect(text).toContain(`a vos, «@${own}»`);
    for (const old of ["hilo de dos", "en uno de más", "dirigidos a vos", "despierta solo cuando la nombran"])
      expect(text).not.toContain(old);
  };
  threads(rules("mind:notes"), "Notas");
  expect(rules("mind:notes")).toContain("las acciones de tu programa");
  threads(rules("mind:talk"), "Talk");
  expect(rules("mind:talk")).not.toContain("acciones de tu programa");
  threads(assistantMindRules.text("es", { name: "Nora", owner: "ana" }), "Nora");
  threads(supervisorHouse.text("es", {}), "Supervisor");
});
