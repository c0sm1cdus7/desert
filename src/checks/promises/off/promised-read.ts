// Derived checks for reading across tools and for people outside the house.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { stacksOf } from "../../../surface/menus/lists.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { promiseTexts } from "../../../texts/promises.texts.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { Composition } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { menuRows, seated, type Seat } from "../promised-keys.ts";
import { staged, type Check } from "../promised-stage.ts";
/** References on the things the case prepared must lead somewhere even without their tools. */
export function foreignReferences<X extends Program>(seat: Seat<X>, program: Composition<X>): void {
  for (const source of program.registry) {
    for (const target of [source.id, ...source.targets(seat.state())]) {
      const sourceView = seat.tools.find(tool => tool.id === source.id);
      const references =
        sourceView
          ?.view(target === source.id ? undefined : target)
          .flatMap(stack => stack.rows)
          .filter(
            row =>
              row.opens !== undefined &&
              program.registry.some(
                other => other.id !== source.id && other.targets(seat.state()).includes(row.opens ?? ""),
              ),
          ) ?? [];
      const resolved = stacksOf(
        { kind: "view", tool: source.id, ...(target === source.id ? {} : { target }), at: 0 },
        seat.tools,
      ).flatMap(stack => stack.rows);
      for (const reference of references)
        ok(resolved.some(row => row.opens === reference.opens && row.open?.kind === "view"));
    }
  }
}
/** A person outside the house cannot open or search any tool, nor receive its lists. */
export function absentCheck<X extends Program>(program: Composition<X>, shown: Shown<X>): Check {
  return {
    name: promiseTexts.absentReader,
    run: () =>
      staged(program, ({ house }) => {
        let absent = "__absent__";
        while (house().tools.state().house.grants.has(absent)) absent += "_";
        const seat = seated(house(), absent, shown);
        try {
          for (const tool of seat.tools.filter(item => item.id !== "preferences")) {
            strictEqual(tool.off?.(), toolTexts.unassigned);
            deepStrictEqual(tool.notices?.().needs ?? [], []);
            deepStrictEqual(tool.notices?.().news ?? [], []);
          }
          const rows = menuRows(seat.tools);
          for (const tool of program.registry) {
            const row = rows.find(item => item.key === shown.words[tool.id]?.key);
            strictEqual(row?.open, undefined);
          }
        } finally {
          seat.router.stop();
        }
        return Promise.resolve();
      }),
  };
}
