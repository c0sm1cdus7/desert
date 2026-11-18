import { describe, expect, it } from "vitest";
import { componer } from "../../runtime/distributions/compose.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { objectOf } from "./destinations.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
describe("program group adaptation", () => {
  it("routes two folders and identically named objects, rejects every crossed destination and replays", async () => {
    const composition = componer(sampleOptions);
    const rig = distributionRig(composition.program);
    try {
      expect(rig.attend("notas").status).toBe("accepted");
      for (const group of ["personal", "shared"]) {
        expect((await settle(rig.act(`${group}/add`, `notas/${group}`))).status).toBe("accepted");
        expect((await settle(rig.act(`${group}/edit`, objectOf("notas", group, "same")))).status).toBe("accepted");
      }
      expect(rig.state().tools.notas.count).toBe(4);
      for (const [action, target] of [
        ["personal/add", "notas"],
        ["personal/add", "notas/shared"],
        ["personal/add", "notas/personal/same"],
        ["personal/edit", "notas/personal"],
        ["personal/edit", "notas/shared/same"],
        ["shared/edit", "notas/personal/same"],
        ["personal/edit", "notas/personal/missing"],
      ]) {
        const result = await settle(rig.act(action ?? "", target ?? ""));
        expect(result.status).toBe("rejected");
        expect(result.reason).toBe(toolTexts.unknown);
      }
      expect(rig.state().tools.notas.count).toBe(4);
      rig.restart();
      expect(rig.state().tools.notas.count).toBe(4);
      expect((await settle(rig.act("personal/edit", objectOf("notas", "personal", "a/b#c")))).status).toBe("accepted");
      expect(rig.state().tools.notas.count).toBe(5);
    } finally {
      rig.close();
    }
  });
  it("shows folders, their local rows and objects with only their own applicable actions", () => {
    const composition = componer(sampleOptions);
    const rig = distributionRig(composition.program);
    try {
      rig.attend("notas");
      const tools = houseTools(rig.ports(), composition.shown);
      const notes = tools.find(tool => tool.id === "notas");
      expect(notes).toBeDefined();
      expect(
        notes
          ?.view()
          .flatMap(stack => stack.rows)
          .map(row => row.opens),
      ).toEqual(["notas/personal", "notas/shared"]);
      expect(
        notes
          ?.view("notas/personal")
          .flatMap(stack => stack.rows)
          .some(row => row.opens === "notas/personal/same"),
      ).toBe(true);
      expect(
        notes
          ?.view("notas/personal/same")
          .flatMap(stack => stack.rows)
          .some(row => row.title === "Cantidad"),
      ).toBe(true);
      expect(notes?.actsOn?.["personal/add"]?.listed?.("notas/personal")).toBe(true);
      expect(notes?.actsOn?.["personal/edit"]?.listed?.("notas/personal")).toBe(false);
      expect(notes?.actsOn?.["shared/edit"]?.listed?.("notas/personal/same")).toBe(false);
    } finally {
      rig.close();
    }
  });
});
