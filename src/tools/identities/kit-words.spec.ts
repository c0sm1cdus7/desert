import { expect, it } from "vitest";
import { wordsDistribution } from "../../../tests/support/words-distribution.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { identitiesTool } from "./identities.ts";
import { identityReading } from "./identity-reading.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
it("counts the selected level without turning loose actions into folders, including after replay", () => {
  const rig = distributionRig({
    ...wordsDistribution.program,
    registry: [
      ...wordsDistribution.program.registry,
      identitiesTool(wordsDistribution.program.registry, "house", false),
    ],
  });
  try {
    const registry = rig.ports().registry;
    rig.attend("identities");
    const created = rig.act("new", "identities", {
      identity: "lucia",
      name: "Lucía",
      tools: ["notes", "conversation"],
    });
    expect(created).toMatchObject({ status: "accepted" });
    const read = () => identityReading(rig.state().house, "identities/lucia", registry, "ana");
    expect(JSON.parse(read())).toMatchObject({ state: "2 programas" });
    rig.attend("identities/lucia");
    rig.act("kit:notes", "identities/lucia", { value: "no" });
    rig.act("kit:notes:shared/add", "identities/lucia", { value: "yes" });
    rig.act("kit:notes:shared/edit", "identities/lucia", { value: "yes" });
    expect(JSON.parse(read())).toMatchObject({ state: "1 programa · 2 acciones" });
    rig.act("kit:notes/personal", "identities/lucia", { value: "yes" });
    expect(JSON.parse(read())).toMatchObject({ state: "1 programa · 1 herramienta · 2 acciones" });
    rig.restart();
    expect(JSON.parse(read())).toMatchObject({ state: "1 programa · 1 herramienta · 2 acciones" });
    const tools = houseTools(rig.ports(), wordsDistribution.shown);
    const core = tools.find(tool => tool.id === "identities");
    expect(core?.view("identities/lucia").some(stack => stack.title === "Kit")).toBe(true);
    expect(core?.titleOf?.("identities/lucia#kit:notes/personal")).toBe("Personales");
    expect(
      core
        ?.view("identities/lucia#tools")
        .flatMap(stack => stack.rows)
        .map(row => row.title),
    ).toEqual(["Notas", "Conversación"]);
    expect(identityTexts.count(0, 0, 0)).toBe("0 acciones");
  } finally {
    rig.close();
  }
});
