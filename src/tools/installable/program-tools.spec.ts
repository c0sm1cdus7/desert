// Every tool of an installable program has its row among the program's tools; no word of a tool takes it off.
import { describe, expect, it } from "vitest";
import { pickingProgram } from "../../../tests/support/installable-picking.ts";
import { presentation } from "../../../tests/support/installable-program.ts";
import type { ProgramWords } from "../../fields/installable-words.ts";
import { seated } from "../../checks/promises/promised-keys.ts";
import { cast, staged } from "../../checks/promises/promised-stage.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import { stacksOf } from "../../surface/menus/lists.ts";
import { distributionTexts as distribution } from "../../texts/distributions.texts.ts";
import { folderOf } from "./destinations.ts";
import { programa } from "./program.ts";

const picking = pickingProgram();
/** The retired `inside` (Franco, 22/11/2026: «programa alberga herramientas»), written as a tool's word. */
const saying = (words: ProgramWords, home: string): ProgramWords => Object.assign({}, words, { inside: home });
/** The picking program whose tools say they live in another of its tools. */
function living(homes: Readonly<Record<string, string>>) {
  const { id, version, desert, codigo, hechos, inicial } = picking;
  const herramientas = Object.fromEntries(
    Object.entries(picking.herramientas).map(([name, group]) => {
      const home = homes[name];
      return [name, home === undefined ? group : { ...group, palabras: saying(group.palabras, home) }];
    }),
  );
  return programa({ id, version, desert, codigo, hechos, inicial }, { ...picking, herramientas });
}
describe("the tools an installable program holds", () => {
  it.each([
    ["as it is declared", {}],
    ["when a tool says it lives in another", { extras: "orders" }],
    ["when every tool says it lives in another", { items: "orders", orders: "extras", extras: "items" }],
  ])("lists every tool on its own row among the program's tools, %s", (_, homes) => {
    const installed = living(homes);
    const { program, shown } = componer({
      programas: [installed],
      identidades: true,
      mentes: { asistentes: false, programas: [] },
      presentacion: presentation,
    });
    return staged(program, ({ house }) => {
      const seat = seated(house(), cast.admin, shown);
      try {
        const listed = stacksOf({ kind: "view", tool: "picking", at: 0 }, seat.tools).find(
          stack => stack.title === distribution.groups,
        );
        const every = Object.keys(installed.herramientas).map(group => folderOf("picking", group));
        expect(listed?.rows.map(row => row.opens)).toEqual(every);
        expect(seat.defects).toEqual([]);
      } finally {
        seat.router.stop();
      }
      return Promise.resolve();
    });
  });
});
