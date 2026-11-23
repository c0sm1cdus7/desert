import { describe, expect, it } from "vitest";
import { compose } from "../../runtime/distributions/compose.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { objectOf } from "./destinations.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
describe("program group adaptation", () => {
  it("routes two folders and identically named objects, rejects every crossed destination and replays", async () => {
    const composition = compose(sampleOptions);
    const rig = distributionRig(composition.program);
    try {
      expect(rig.attend("notes").status).toBe("accepted");
      for (const group of ["personal", "shared"]) {
        expect((await settle(rig.act(`${group}/add`, `notes/${group}`))).status).toBe("accepted");
        expect((await settle(rig.act(`${group}/edit`, objectOf("notes", group, "same")))).status).toBe("accepted");
      }
      expect(rig.state().tools.notes.count).toBe(4);
      for (const [action, target] of [
        ["personal/add", "notes"],
        ["personal/add", "notes/shared"],
        ["personal/add", "notes/personal/same"],
        ["personal/edit", "notes/personal"],
        ["personal/edit", "notes/shared/same"],
        ["shared/edit", "notes/personal/same"],
        ["personal/edit", "notes/personal/missing"],
      ]) {
        const result = await settle(rig.act(action ?? "", target ?? ""));
        expect(result.status).toBe("rejected");
        expect(result.reason).toBe(toolTexts.unknown);
      }
      expect(rig.state().tools.notes.count).toBe(4);
      rig.restart();
      expect(rig.state().tools.notes.count).toBe(4);
      expect((await settle(rig.act("personal/edit", objectOf("notes", "personal", "a/b#c")))).status).toBe("accepted");
      expect(rig.state().tools.notes.count).toBe(5);
    } finally {
      rig.close();
    }
  });
  it("shows folders, their local rows and objects with only their own applicable actions", () => {
    const composition = compose(sampleOptions);
    const rig = distributionRig(composition.program);
    try {
      rig.attend("notes");
      const tools = houseTools(rig.ports(), composition.shown, "es");
      const notes = tools.find(tool => tool.id === "notes");
      expect(notes).toBeDefined();
      expect(
        notes
          ?.view()
          .flatMap(stack => stack.rows)
          .map(row => row.opens),
      ).toEqual(["notes/personal", "notes/shared"]);
      expect(
        notes
          ?.view("notes/personal")
          .flatMap(stack => stack.rows)
          .some(row => row.opens === "notes/personal/same"),
      ).toBe(true);
      expect(
        notes
          ?.view("notes/personal/same")
          .flatMap(stack => stack.rows)
          .some(row => row.title === "Cantidad"),
      ).toBe(true);
      expect(notes?.actsOn?.["personal/add"]?.listed?.("notes/personal")).toBe(true);
      expect(notes?.actsOn?.["personal/edit"]?.listed?.("notes/personal")).toBe(false);
      expect(notes?.actsOn?.["shared/edit"]?.listed?.("notes/personal/same")).toBe(false);
    } finally {
      rig.close();
    }
  });
});
