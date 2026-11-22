// Rechaza selecciones nuevas inexistentes o reservadas sin borrar las retiradas de la historia.
import { systemTool } from "./system-tools.ts";
import { effectRefusalTexts } from "../texts/tools.texts.ts";
import {
  actionSelection,
  covers,
  toolOf,
  kitLayout,
  selectionPath,
  type KitProgram,
  type SelectionKit,
} from "./kit-selection.ts";
export function selectionProblem(kit: SelectionKit, registry: readonly KitProgram[]): string | undefined {
  const paths = kit.selections.map(selectionPath);
  if (new Set(paths).size !== paths.length) return effectRefusalTexts.repeatedActs;
  const layout = kitLayout(registry);
  for (const selection of kit.selections) {
    if (systemTool(selection.program)) return effectRefusalTexts.adminKit;
    const program = registry.find(program => program.id === selection.program);
    if (!program) return effectRefusalTexts.unassignedTool;
    const actions = Object.keys(program.acts ?? {});
    if (selection.kind === "program") continue;
    if (!actions.some(action => toolOf(program.id, action, layout) === selection.tool))
      return effectRefusalTexts.unknownAct;
    if (
      selection.kind === "action" &&
      !actions.some(action => covers(selection, actionSelection(program.id, action, layout)))
    )
      return effectRefusalTexts.unknownAct;
  }
  return undefined;
}
