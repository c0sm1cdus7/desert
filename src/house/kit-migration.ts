// Applies versioned mappings and refuses ambiguous scopes or reused retired identifiers.
import { selectionProblem } from "./kit-validation.ts";
import {
  actionSelection,
  kitLayout,
  covers,
  selectionKit,
  selectionPath,
  type KitProgram,
  type Selection,
  type SelectionKit,
} from "./kit-selection.ts";
export type KitMigration = Readonly<{
  version: number;
  scopes: readonly Readonly<{ from: string; program: string; tool: string }>[];
  actions: readonly Readonly<{
    from: Extract<Selection, { kind: "action" }>;
    to: Extract<Selection, { kind: "action" }>;
  }>[];
  retired: readonly Selection[];
}>;
export function migrateKit(kit: SelectionKit, migration?: KitMigration): SelectionKit {
  if (!migration) return kit;
  return selectionKit(
    kit.selections.flatMap(selection => {
      const scope = migration.scopes.find(
        item => selection.kind !== "program" && item.from === selection.program && item.from === selection.tool,
      );
      const scoped =
        scope && selection.kind !== "program" ? { ...selection, program: scope.program, tool: scope.tool } : selection;
      const renamed = migration.actions.find(item => selectionPath(item.from) === selectionPath(scoped));
      if (renamed) return [renamed.to];
      return migration.retired.some(retired => covers(retired, selection) || covers(retired, scoped)) ? [] : [scoped];
    }),
  );
}
export function checkKitMigration(migration: KitMigration, registry: readonly KitProgram[]): void {
  if (!Number.isSafeInteger(migration.version) || migration.version < 1)
    throw new Error("Invalid kit migration version");
  const scopes = migration.scopes.map(item => item.from);
  const actions = migration.actions.map(item => selectionPath(item.from));
  if (new Set(scopes).size !== scopes.length || new Set(actions).size !== actions.length)
    throw new Error("Ambiguous kit migration");
  if (migration.actions.some(item => item.from.program !== item.to.program || actions.includes(selectionPath(item.to))))
    throw new Error("Invalid kit migration target");
  for (const program of registry)
    for (const action of Object.keys(program.acts ?? {})) {
      const selection = actionSelection(program.id, action, kitLayout(registry));
      if (migration.retired.some(retired => covers(retired, selection)) || actions.includes(selectionPath(selection)))
        throw new Error("Retired kit identifier reused");
    }
  const targets: Selection[] = [
    ...migration.scopes.map(scope => ({ kind: "tool" as const, program: scope.program, tool: scope.tool })),
    ...migration.actions.map(action => action.to),
  ];
  if (selectionProblem(selectionKit(targets), registry)) throw new Error("Invalid kit migration target");
}
