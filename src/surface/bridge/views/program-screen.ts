// Only screens supplied by a program cross this boundary; built-in screen code keeps its base origin.
import type { Program } from "../../../tools/tool-contract.ts";
import type { ProgramScreen } from "../ports/house-ports.ts";
import { programCall } from "../../../fields/program-call.ts";
import { anyToolScreen } from "./any-tool.ts";
import { programFunctions, baseFunctions } from "../../../tools/boundaries/program-functions.ts";
import type { Field } from "../../contract/contract.ts";
import type { Tool, ToolAct, ThingAct } from "../../contract/shown-tool.ts";
type Guard = typeof programFunctions;
const fieldOf = (field: Field | null, guard: Guard): Field | null => {
  if (!field) return null;
  const guarded = guard(field);
  return "mask" in guarded ? { ...guarded, mask: guard(guarded.mask) } : guarded;
};
function actsOf<A extends unknown[], T extends { next: (...args: A) => Field | null }>(
  acts: Readonly<Record<string, T>>,
  guard: Guard = programFunctions,
): Readonly<Record<string, T & { next: (...args: A) => Field | null }>> {
  return Object.fromEntries(
    Object.entries(acts).map(([name, act]) => {
      const guarded = guard(act);
      return [name, { ...guarded, next: (...args: A) => fieldOf(guarded.next(...args), guard) }];
    }),
  );
}
export function programScreen(screen: Tool): Tool {
  const guarded = programFunctions(screen);
  return {
    ...guarded,
    acts: actsOf<[readonly string[]], ToolAct>(guarded.acts),
    ...(guarded.actsOn ? { actsOn: actsOf<[readonly string[], string], ThingAct>(guarded.actsOn) } : {}),
    ...(guarded.menusOn
      ? {
          menusOn: Object.fromEntries(
            Object.entries(guarded.menusOn).map(([key, menu]) => [key, programFunctions(menu)]),
          ),
        }
      : {}),
    ...(guarded.conversation ? { conversation: programFunctions(guarded.conversation) } : {}),
    ...(guarded.conversationAt
      ? {
          conversationAt: (target: string) => {
            const conversation = guarded.conversationAt?.(target);
            return conversation ? programFunctions(conversation) : undefined;
          },
        }
      : {}),
    view: target =>
      guarded.view(target).map(stack => ({
        ...stack,
        rows: stack.rows.map(row => programFunctions(row)),
      })),
    ...(guarded.find
      ? { find: (sought: string) => guarded.find?.(sought).map(row => programFunctions(row)) ?? [] }
      : {}),
  };
}

export function builtScreen<X extends Program>(
  custom: ProgramScreen<X> | undefined,
  ...args: Parameters<ProgramScreen<X>>
) {
  if (!custom) return anyToolScreen(...args);
  const [ports, tool, words, acts, start] = args;
  const safe = {
    ...acts,
    acts: actsOf<[readonly string[]], ToolAct>(acts.acts, baseFunctions),
    ...(acts.actsOn ? { actsOn: actsOf<[readonly string[], string], ThingAct>(acts.actsOn, baseFunctions) } : {}),
  };
  return programScreen(programCall(custom, baseFunctions(ports), tool, words, safe, baseFunctions({ start }).start));
}
