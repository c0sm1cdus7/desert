// A house's tools as a surface sees them: what is read comes from the house, and every change goes through its acts.
import { allowed } from "../../house/house.ts";
import type { Program, Tool as HouseTool } from "../../tools/tool-contract.ts";
import type { Tool } from "../contract.ts";
import { anyToolScreen } from "./any-tool.ts";
import type { HousePorts, SurfacePorts, SurfaceWords, ToolWords } from "./house-ports.ts";
/** A tool that needs more than rows and acts brings its own screen; every other tool reads as any tool. */
export type Screens<X extends Program> = Readonly<
  Record<string, (ports: SurfacePorts<X>, tool: HouseTool<X>, words: ToolWords) => Tool>
>;
export function houseTools<X extends Program>(
  ports: HousePorts<X>,
  words: SurfaceWords,
  screens: Screens<X> = {},
): readonly Tool[] {
  const shown = new Map<string, number>();
  const observed: SurfacePorts<X> = { ...ports, act: value => ports.act(value, shown.get(value.target ?? "") ?? 0) };
  const wordless = ports.registry.filter(tool => !words[tool.id]).map(tool => tool.id);
  if (wordless.length) throw new Error(`No words for the tools ${wordless.join(", ")}`);
  return ports.registry.flatMap(contract => {
    const named = words[contract.id];
    if (!named) return [];
    const tool = (screens[contract.id] ?? anyToolScreen)(observed, contract, named);
    const calls = () => ports.state().attention.has(contract.id);
    return {
      ...tool,
      held: () => allowed(ports.state().house, ports.me, contract.id),
      calls,
      rendered: (target = contract.id) => {
        shown.set(target, ports.state().through);
        // Looking at what called you is attending it, the same act anyone does.
        if (calls()) ports.act({ act: "attend", input: { target: contract.id } }, 0);
      },
    };
  });
}
