// A house's tools as a surface sees them: what is read comes from the house, and every change goes through its acts.
import { allowed } from "../../house/house.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program, Tool as HouseTool } from "../../tools/tool-contract.ts";
import type { Tool } from "../contract.ts";
import { backKey as back } from "../screen.ts";
import { anyToolScreen, programActs } from "./any-tool.ts";
import type { HousePorts, Shown, SurfacePorts } from "./house-ports.ts";

/** Only a tool whose acts say how they are offered can be shown: an act without its declaration is a defect. */
const isProgramTool = <X extends Program>(tool: HouseTool<X>): tool is ProgramTool<X> =>
  Object.values(tool.acts).every(act => "label" in act && "key" in act && "cases" in act);
const repeated = (keys: readonly string[]): string[] => keys.filter((key, index) => keys.indexOf(key) !== index);
/** Every option is reached by a key of its own where it is offered: two with the same key is a defect. */
function audit<X extends Program>(tools: readonly ProgramTool<X>[], shown: Shown<X>): void {
  const wordless = tools.filter(tool => !shown.words[tool.id]).map(tool => tool.id);
  if (wordless.length) throw new Error(`No words for the tools ${wordless.join(", ")}`);
  const taken = repeated(tools.map(tool => shown.words[tool.id]?.key ?? ""));
  if (taken.length) throw new Error(`Two tools take the same key: ${taken.join(", ")}`);
  for (const tool of tools) {
    /** Where an act asks to be confirmed, its own key takes it and this one goes back: they cannot be the same. */
    if (Object.values(tool.acts).some(act => act.key === back))
      throw new Error(`An act of ${tool.id} takes the key that goes back: ${back}`);
    for (const on of ["tool", "thing"] as const) {
      const keys = repeated(Object.values(tool.acts).flatMap(act => (act.on === on ? [act.key] : [])));
      if (keys.length) throw new Error(`Two acts of ${tool.id} take the same key: ${keys.join(", ")}`);
    }
  }
}
export function houseTools<X extends Program>(ports: HousePorts<X>, shown: Shown<X>): readonly Tool[] {
  const seen = new Map<string, number>();
  const observed: SurfacePorts<X> = { ...ports, act: value => ports.act(value, seen.get(value.target ?? "") ?? 0) };
  const undeclared = ports.registry.filter(tool => !isProgramTool(tool)).map(tool => tool.id);
  if (undeclared.length) throw new Error(`Acts without their declaration in ${undeclared.join(", ")}`);
  const tools = ports.registry.filter(isProgramTool);
  audit(tools, shown);
  return tools.flatMap(contract => {
    const words = shown.words[contract.id];
    if (!words) return [];
    const acts = programActs(observed, contract, shown.locale);
    const tool = (shown.screens?.[contract.id] ?? anyToolScreen)(observed, contract, words, acts);
    const calls = () => ports.state().attention.has(contract.id);
    return {
      ...tool,
      held: () => allowed(ports.state().house, ports.me, contract.id),
      calls,
      rendered: (target = contract.id) => {
        seen.set(target, ports.state().through);
        // Looking at what called you is attending it, the same act anyone does.
        if (calls()) ports.act({ act: "attend", input: { target: contract.id } }, 0);
      },
    };
  });
}
