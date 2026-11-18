// Guarda selecciones V2 calculadas sobre el estado vigente y conserva las ramas ajenas a la edición.
import { migrateKit } from "../../house/kit-migration.ts";
import { holderKit, storedHolderKit } from "../../house/kit-history.ts";
import { editKit } from "../../house/kit-edit.ts";
import { actionSelection, kitLayout, selectionKit, type Selection } from "../../house/kit-selection.ts";
import type { House } from "../../house/members.ts";
import { effect } from "../../house/facts.ts";
import type { Emission } from "../../journal/vocabulary.ts";
import type { Program, Tool } from "../tool-contract.ts";
export function kitEffects<X extends Program>(
  house: House,
  by: string,
  holder: string,
  tool: Tool<X>,
  action: string | undefined,
  yes: boolean,
  group?: string,
): Emission<X["fact"]>[] {
  const layout = kitLayout([tool]);
  let branch: Selection = { kind: "program", program: tool.id };
  if (group !== undefined) branch = { kind: "tool", program: tool.id, tool: group };
  if (action !== undefined) branch = actionSelection(tool.id, action, layout);
  const retired = storedHolderKit(house, holder).selections.filter(
    selection => !migrateKit(selectionKit([selection]), house.kitMigration).selections.length,
  );
  const changed = editKit(holderKit(house, holder), branch, yes, Object.keys(tool.acts), layout);
  const kit = selectionKit([...changed.selections, ...retired]);
  return [effect("kit-set", { version: 2, holder, kit }, by)];
}
