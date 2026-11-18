// Describe selecciones positivas y expande carpetas contra las acciones instaladas.
import { Type, type Static } from "@sinclair/typebox";
import { object } from "../fields/visible-text.ts";
const segment = Type.String({ minLength: 1, pattern: "^[^/]+$" });
export const selectionSchema = Type.Union([
  object({ kind: Type.Literal("program"), program: segment }),
  object({ kind: Type.Literal("tool"), program: segment, tool: segment }),
  object({ kind: Type.Literal("action"), program: segment, tool: segment, action: segment }),
]);
export const selectionKitSchema = object({
  version: Type.Literal(2),
  selections: Type.Array(selectionSchema, { uniqueItems: true }),
});
export type Selection = Readonly<Static<typeof selectionSchema>>;
export type SelectionKit = Readonly<{ version: 2; selections: readonly Selection[] }>;
export type KitProgram = Readonly<{
  id: string;
  actionTools?: Readonly<Record<string, string>>;
  acts?: Readonly<Record<string, unknown>>;
}>;
export type KitLayout = Readonly<Record<string, Readonly<Record<string, string>>>>;
export const selectionKit = (selections: readonly Selection[]): SelectionKit => ({ version: 2, selections });
/** Transitional port: a Tool is a program; its default historical tool has the same id. */
export const herramientaDe = (program: string, action: string, layout: KitLayout = {}): string =>
  layout[program]?.[action] ?? program;
export const kitLayout = (registry: readonly KitProgram[]): KitLayout =>
  Object.fromEntries(
    registry
      .filter(program => program.actionTools !== undefined)
      .map(program => [program.id, program.actionTools ?? {}]),
  );
export const selectionPath = (selection: Selection): string =>
  [
    selection.program,
    ...(selection.kind === "program" ? [] : [selection.tool]),
    ...(selection.kind === "action" ? [selection.action] : []),
  ].join("/");
export const covers = (parent: Selection, child: Selection): boolean =>
  parent.program === child.program &&
  (parent.kind === "program" ||
    (child.kind !== "program" &&
      parent.tool === child.tool &&
      (parent.kind === "tool" || (child.kind === "action" && parent.action === child.action))));
export const selects = (kit: SelectionKit, program: string, tool: string, action: string): boolean =>
  program !== "identities" &&
  kit.selections.some(selection => covers(selection, { kind: "action", program, tool, action }));
export function expandKit(kit: SelectionKit, registry: readonly KitProgram[]) {
  const layout = kitLayout(registry);
  return registry.flatMap(program => {
    const acts = Object.keys(program.acts ?? {}).filter(action =>
      selects(kit, program.id, herramientaDe(program.id, action, layout), action),
    );
    return acts.length ? [{ tool: program.id, acts }] : [];
  });
}
/** Historical lists never become folders, even when they enumerate every installed action. */
export const explicitKit = (
  kit: readonly Readonly<{ tool: string; acts: readonly string[] }>[],
  layout: KitLayout = {},
): SelectionKit =>
  selectionKit(
    kit.flatMap(({ tool, acts }) =>
      acts.map(action => ({
        kind: "action" as const,
        program: tool,
        tool: herramientaDe(tool, action, layout),
        action,
      })),
    ),
  );
export const programKit = (programs: readonly string[]): SelectionKit =>
  selectionKit(programs.map(program => ({ kind: "program", program })));
