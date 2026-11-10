// What a person sees of what they cannot do, checked for every tool of a program: nobody writes these either.
import { ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Composition, ProgramTool } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { menuRows, seated, type, view } from "./promised-keys.ts";
import { cast, staged, type Check } from "./promised-stage.ts";

/** A tool nobody gave you is on your Menu all the same: off, saying why, and its key opens nothing. */
function foreignCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, tool: ProgramTool<X>): Check {
  const run = (): Promise<void> =>
    staged(program, ({ house }) => {
      const seat = seated(house(), cast.outsider, shown);
      const key = shown.words[tool.id]?.key ?? "";
      const row = menuRows(seat.tools).find(listed => listed.key === key);
      ok(row?.off, said.notOnMenu(tool.id));
      strictEqual(row.detail, generic.notHeld);
      type(seat.router, key);
      strictEqual(seat.router.screen(view).title, surface.menu);
      seat.router.stop();
      return Promise.resolve();
    });
  return { name: `${tool.id} · ${said.foreign}`, run };
}
export function shownChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  return program.registry.map(tool => foreignCheck(program, shown, tool));
}
