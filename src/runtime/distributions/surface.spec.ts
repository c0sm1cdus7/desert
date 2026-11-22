import { expect, it } from "vitest";
import { compose } from "./compose.ts";
import { defineProgram } from "../../tools/installable/program.ts";
import { sampleMetadata, sampleBody, sampleOptions } from "../../../tests/support/installable-program.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { stacksOf } from "../../surface/menus/lists.ts";
import { step } from "../../surface/router/step.ts";
import { start } from "../../surface/session/screen.ts";

it.each([undefined, false, true])("keeps all three levels unless the one-tool shortcut is explicit: %s", shortcut => {
  const single = defineProgram(sampleMetadata, {
    ...sampleBody,
    tools: { personal: sampleBody.tools.personal },
  });
  const distribution = compose({
    ...sampleOptions,
    programs: [single],
    ...(shortcut === undefined ? {} : { singleToolShortcut: shortcut }),
  });
  const rig = distributionRig(distribution.program);
  try {
    const tools = houseTools(rig.ports(), distribution.shown);
    const menu = stacksOf({ kind: "menu", at: 0 }, tools);
    expect(menu.find(s => s.title === "Programas")?.rows.map(row => row.title)).toEqual(["notas"]);
    expect(menu.some(s => s.title === "Herramientas")).toBe(false);
    expect(menu.some(s => s.title === "Sistema")).toBe(true);
    const entered = step(start, { kind: "type", text: "n" }, tools, 1000).session;
    const place = entered.at(-1);
    expect(place).toEqual({ kind: "view", tool: "notes", at: 0, ...(shortcut ? { target: "notes/personal" } : {}) });
    if (!place || place.kind !== "view") throw new Error("Missing program view");
    const stacks = stacksOf(place, tools);
    expect(stacks.some(s => s.title === "Herramientas")).toBe(!shortcut);
    expect(stacks.some(s => s.title === "Acciones")).toBe(shortcut === true);
    const folder = shortcut ? entered : step(entered, { kind: "confirm" }, tools, 1000).session;
    expect(folder.at(-1)).toEqual({ kind: "view", tool: "notes", target: "notes/personal", at: 0 });
    const action = step(folder, { kind: "type", text: "a" }, tools, 1000).session.at(-1);
    expect(action).toMatchObject({ kind: "act", tool: "notes", act: "personal/add", target: "notes/personal" });
    const back = step(folder, { kind: "cancel" }, tools, 1000).session;
    expect(back.at(-1)).toEqual(shortcut ? { kind: "menu", at: 0 } : { kind: "view", tool: "notes", at: 0 });
  } finally {
    rig.close();
  }
});
it("keeps the folder screen for multiple tools even with the shortcut on", () => {
  const distribution = compose({ ...sampleOptions, singleToolShortcut: true });
  const rig = distributionRig(distribution.program);
  try {
    const tools = houseTools(rig.ports(), distribution.shown);
    expect(step(start, { kind: "type", text: "n" }, tools, 1000).session.at(-1)).toEqual({
      kind: "view",
      tool: "notes",
      at: 0,
    });
  } finally {
    rig.close();
  }
});
