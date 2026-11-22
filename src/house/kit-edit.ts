// Edita selecciones positivas sobre el estado vigente y abre solamente las carpetas afectadas.
import {
  actionSelection,
  covers,
  toolOf,
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
      const groups = [...new Set(actions.map(action => toolOf(branch.program, action, layout)))];
      const siblings: Selection[] =
        selection.kind === "program" && branch.kind !== "program"
          ? groups.filter(tool => tool !== branch.tool).map(tool => ({ kind: "tool", program: branch.program, tool }))
          : [];
      if (branch.kind === "action")
        siblings.push(
          ...actions
            .filter(
              action =>
                !covers(branch, actionSelection(branch.program, action, layout)) &&
                toolOf(branch.program, action, layout) === branch.tool,
            )
            .map(action => actionSelection(branch.program, action, layout)),
        );
      return siblings;
    }),
  );
}
