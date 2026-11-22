import "../../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { componer } from "./compose.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { startHouse, localPorts } from "../house-runtime.ts";
import { requestProgram } from "../../../tests/support/request-program.ts";
import { talkProgram } from "../../../tests/support/talk-program.ts";
import { assistantMindRules } from "../../texts/program-mind.texts.ts";
import { supervisorHouse } from "../../texts/supervisor.texts.ts";
it("deriva una mente y abre sin llave, con el motivo visible", async () => {
  const distribution = componer({ ...sampleOptions, mentes: { asistentes: false, programas: ["notas"] } });
  expect(distribution.mindDefinitions.map(mind => [mind.actor, mind.role])).toEqual([["mind:notas", "program:notas"]]);
  const modelMinds = await distribution.modelMinds({
    language: "es",
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
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notas"] }] },
  });
  try {
    await (await house.minds)?.flush();
    expect(localPorts(house, "ana", { recentLines: 20 }).openingNotices?.().join(" ")).toContain("llave");
    expect(house.tools.state().house.scenes.get("mind:notas")?.data.general).toContain("llave");
  } finally {
    house.close();
    rmSync(home, { recursive: true, force: true });
  }
});
it("22/11: each mind knows what wakes it and how it is named; a talking program's mind is not told of its acts", () => {
  const distribution = componer({
    ...sampleOptions,
    programas: [requestProgram(), talkProgram],
    mentes: { asistentes: false, programas: ["notes", "talk"] },
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
