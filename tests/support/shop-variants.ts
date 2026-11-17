// The test shop's variants say only what changes from it: an act more, acts in place of its own, a part of a tool.
import { must } from "../../src/surface/session/window.ts";
import type { ProgramScreen, Shown } from "../../src/surface/bridge/ports/house-ports.ts";
import type { Composition, ProgramAct, ProgramTool } from "../../src/tools/promises.ts";
import { identitiesTool } from "../../src/tools/identities/identities.ts";
import { shopProgram, shopShown, type Shop } from "./shop.ts";

type Act = ProgramAct<Shop>;
/** What changes of one tool: acts after its own, or in place of them with `only`, and any other part it declares. */
type ToolChange = Partial<Omit<ProgramTool<Shop>, "id" | "acts">> &
  Readonly<{ acts?: Readonly<Record<string, Act>>; only?: true }>;
/** What changes of the shop: each of its two tools, tools after them, and any other part of the program. */
type ShopChange = Readonly<{ sales?: ToolChange; payments?: ToolChange; more?: readonly ProgramTool<Shop>[] }> &
  Partial<Omit<Composition<Shop>, "registry">>;
const changed = (tool: ProgramTool<Shop>, change: ToolChange | undefined): ProgramTool<Shop> => {
  if (!change) return tool;
  const { acts = {}, only, ...rest } = change;
  return { ...tool, ...rest, acts: only ? acts : { ...tool.acts, ...acts } };
};
/** A change said of a tool the program does not have is a mistake of the test, never a change that does nothing. */
const present = (from: Composition<Shop>, id: string): void => {
  if (!from.registry.some(tool => tool.id === id)) throw new Error(`the shop has no tool ${id}`);
};
/** The shop with what changes said, and nothing else: a tool nobody changes stays the very same. */
export const shopWith = (
  { sales, payments, more = [], ...program }: ShopChange,
  from: Composition<Shop> = shopProgram,
): Composition<Shop> => {
  const changes: Readonly<Record<string, ToolChange | undefined>> = { sales, payments };
  for (const [id, change] of Object.entries(changes)) if (change) present(from, id);
  return { ...from, ...program, registry: [...from.registry.map(tool => changed(tool, changes[tool.id])), ...more] };
};
/** A variant made again from another: one of its tools, as it was, changed. */
export const toolRewritten = (
  from: Composition<Shop>,
  id: string,
  change: (tool: ProgramTool<Shop>) => ProgramTool<Shop>,
): Composition<Shop> => {
  present(from, id);
  return { ...from, registry: from.registry.map(tool => (tool.id === id ? change(tool) : tool)) };
};
/** A variant made again from another: one act of one of its tools, as it was, changed. */
export const actRewritten = (from: Composition<Shop>, id: string, name: string, change: (act: Act) => Act) =>
  toolRewritten(from, id, tool => ({ ...tool, acts: { ...tool.acts, [name]: change(must(tool.acts[name])) } }));
/** The same program, which asks for the core of identities and lists its tool after its own. */
export const withIdentities = (from: Composition<Shop>): Composition<Shop> => ({
  ...from,
  identities: true,
  registry: [...from.registry, identitiesTool(from.registry, "house")],
});
/** The shop as it is shown, with screens of its own for some of its tools. */
export const shownWith = (
  screens: Readonly<Record<string, ProgramScreen<Shop>>>,
  from: Shown<Shop> = shopShown,
): Shown<Shop> => ({ ...from, screens: { ...from.screens, ...screens } });
