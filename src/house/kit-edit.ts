// Edita selecciones positivas sobre el estado vigente y abre solamente las carpetas afectadas.
import {
  covers,
  herramientaDe,
  selectionKit,
  type KitLayout,
  type Selection,
  type SelectionKit,
} from "./kit-selection.ts";
/** Removing an inherited action materializes siblings; new actions in that branch stop being inherited. */
export function editKit(
  kit: SelectionKit,
  branch: Selection,
  yes: boolean,
  actions: readonly string[],
  layout: KitLayout = {},
): SelectionKit {
  const rest = kit.selections.filter(selection => !covers(branch, selection));
  if (yes) return selectionKit(rest.some(selection => covers(selection, branch)) ? rest : [...rest, branch]);
  return selectionKit(
    rest.flatMap(selection => {
      if (!covers(selection, branch)) return [selection];
      const groups = [...new Set(actions.map(action => herramientaDe(branch.program, action, layout)))];
      const siblings: Selection[] =
        selection.kind === "program" && branch.kind !== "program"
          ? groups.filter(tool => tool !== branch.tool).map(tool => ({ kind: "tool", program: branch.program, tool }))
          : [];
      if (branch.kind === "action")
        siblings.push(
          ...actions
            .filter(action => action !== branch.action && herramientaDe(branch.program, action, layout) === branch.tool)
            .map(action => ({ kind: "action" as const, program: branch.program, tool: branch.tool, action })),
        );
      return siblings;
    }),
  );
}
