import { expect, it } from "vitest";
import { componer } from "./compose.ts";
import { programa } from "../../tools/installable/program.ts";
import { sampleMetadata, sampleBody, sampleOptions } from "../../../tests/support/installable-program.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { stacksOf } from "../../surface/menus/lists.ts";
import { step } from "../../surface/router/step.ts";
import { start } from "../../surface/session/screen.ts";
import { seated, type, view } from "../../checks/promises/promised-keys.ts";
import { cast, staged } from "../../checks/promises/promised-stage.ts";

it.each([undefined, false, true])("keeps all three levels unless the one-tool shortcut is explicit: %s", shortcut => {
  const single = programa(sampleMetadata, {
    ...sampleBody,
    herramientas: { personal: sampleBody.herramientas.personal },
  });
  const distribution = componer({
    ...sampleOptions,
    programas: [single],
    ...(shortcut === undefined ? {} : { atajoUnaHerramienta: shortcut }),
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
    expect(place).toEqual({ kind: "view", tool: "notas", at: 0, ...(shortcut ? { target: "notas/personal" } : {}) });
    if (!place || place.kind !== "view") throw new Error("Missing program view");
    const stacks = stacksOf(place, tools);
    expect(stacks.some(s => s.title === "Herramientas")).toBe(!shortcut);
    expect(stacks.some(s => s.title === "Acciones")).toBe(shortcut === true);
    const folder = shortcut ? entered : step(entered, { kind: "confirm" }, tools, 1000).session;
    expect(folder.at(-1)).toEqual({ kind: "view", tool: "notas", target: "notas/personal", at: 0 });
    const action = step(folder, { kind: "type", text: "a" }, tools, 1000).session.at(-1);
    expect(action).toMatchObject({ kind: "act", tool: "notas", act: "personal/add", target: "notas/personal" });
    const back = step(folder, { kind: "cancel" }, tools, 1000).session;
    expect(back.at(-1)).toEqual(shortcut ? { kind: "menu", at: 0 } : { kind: "view", tool: "notas", at: 0 });
  } finally {
    rig.close();
  }
});
it("keeps the folder screen for multiple tools even with the shortcut on", () => {
  const distribution = componer({ ...sampleOptions, atajoUnaHerramienta: true });
  const rig = distributionRig(distribution.program);
  try {
    const tools = houseTools(rig.ports(), distribution.shown);
    expect(step(start, { kind: "type", text: "n" }, tools, 1000).session.at(-1)).toEqual({
      kind: "view",
      tool: "notas",
      at: 0,
    });
  } finally {
    rig.close();
  }
});
/** Names the members piece as `identidades` says, or leaves it as the base calls it. */
const membersNamed = (identidades?: Readonly<{ name: string; key: string }>) =>
  componer({
    ...sampleOptions,
    presentacion: identidades ? { ...sampleOptions.presentacion, identidades } : sampleOptions.presentacion,
  });
/** The key is test data: Capibara's «u» is already Casa's in Sistema, as the last case shows. */
it.each([
  [undefined, "Identidades", "i"],
  [{ name: "Usuarios", key: "s" }, "Usuarios", "s"],
] as const)("names the members piece as the distribution says: %j", (identidades, name, key) => {
  const distribution = membersNamed(identidades);
  return staged(distribution.program, ({ house }) => {
    const seat = seated(house(), cast.admin, distribution.shown);
    try {
      const members = seat.tools.find(tool => tool.id === "identities");
      expect([members?.name, members?.place]).toEqual([name, { key, section: "system" }]);
      const system = stacksOf({ kind: "menu", at: 0 }, seat.tools).find(stack => stack.title === "Sistema");
      const titles = system?.rows.map(row => row.title) ?? [];
      expect(system?.rows.find(row => row.key === key)?.title).toBe(name.toLowerCase());
      expect(titles.filter(title => ["identidades", "usuarios"].includes(title))).toEqual([name.toLowerCase()]);
      type(seat.router, key);
      expect(seat.router.screen(view).title).toBe(name);
      const stacks = stacksOf({ kind: "view", tool: "identities", at: 0 }, seat.tools);
      expect(stacks.map(stack => stack.title)).toContain(name);
      expect(seat.defects).toEqual([]);
    } finally {
      seat.router.stop();
    }
    return Promise.resolve();
  });
});
it("refuses a name for the members piece whose key another piece of Sistema already takes", () => {
  const distribution = membersNamed({ name: "Usuarios", key: "u" });
  return staged(distribution.program, ({ house }) => {
    expect(() => seated(house(), cast.admin, distribution.shown)).toThrow("Two tools take the same key: u");
    return Promise.resolve();
  });
});
