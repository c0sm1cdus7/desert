import { Type, type Static } from "@sinclair/typebox";
import { FaceIconSchema, type FaceIcon } from "../../interaction/face.ts";
import type { ViewNavigationEntry } from "../../views/program-schema.ts";
import { text } from "../../views/definition.ts";
import type { Frozen } from "../../json.ts";

/** Renderer-owned navigation data. No component, CSS or layout escape hatches. A destination's icon is a face's icon:
 * the shell draws it as the one Face (law 9e; owner decision V1, 2026-10-25: no coloured squares, the face as always). */
export const WorkspaceIconSchema = FaceIconSchema;
export type WorkspaceIcon = FaceIcon;
const closed = { additionalProperties: false } as const;
/** The navigation pane the shell draws (DESIGN §3.2): its identity, the active destination and the grouped destinations
 * `workspaceNavigation` resolves. */
export const ShellNavigationSchema = Type.Object({
  identity: Type.Object({ title: text, subtitle: Type.Optional(text) }, closed),
  settingsPlaceholder: Type.Boolean(),
  active: Type.String(),
  groups: Type.Array(Type.Object({
    label: text,
    items: Type.Array(Type.Object({ id: Type.String(), label: text, icon: WorkspaceIconSchema,
      appearance: Type.Union([Type.Literal("browse"), Type.Literal("travel-kit"), Type.Literal("bank")]) }, closed)),
  }, closed)),
}, closed);
export type ShellNavigation = Frozen<Static<typeof ShellNavigationSchema>>;
export interface WorkspaceDestination<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly shortLabel?: string;
  readonly icon?: WorkspaceIcon;
  readonly group?: string;
  readonly purpose?: ViewNavigationEntry["purpose"];
}

const legacy = {
  browse: { icon: "landmark", group: "Explore", appearance: "browse" },
  "travel-kit": { icon: "backpack", group: "Explore", appearance: "travel-kit" },
  bank: { icon: "panels", group: "Developer", appearance: "bank" },
} as const;
type ResolvedDestination<Id extends string> = WorkspaceDestination<Id> & {
  readonly icon: WorkspaceIcon; readonly appearance: "browse" | "travel-kit" | "bank";
};

export function workspaceNavigation<Id extends string>(navigation: readonly WorkspaceDestination<Id>[]) {
  const groups: { label: string; items: ResolvedDestination<Id>[] }[] = navigation.every(item => item.purpose) ? [] : [
    { label: "Explore", items: [] }, { label: "Developer", items: [] },
  ];
  for (const destination of navigation) {
    if (destination.purpose) {
      if (!destination.group || !destination.icon) throw new Error("WORKSPACE_NAVIGATION_METADATA_REQUIRED");
      let group = groups.find(item => item.label === destination.group);
      if (!group) { group = { label: destination.group, items: [] }; groups.push(group); }
      group.items.push({ ...destination, icon: destination.icon, appearance: destination.purpose === "utility" ? "bank" : "browse" });
      continue;
    }
    // Frozen catalog clients predate authored navigation. Their legacy adapter is
    // not used by a View program, whose closed contract requires purpose/group.
    const defaults = destination.id === "browse" ? legacy.browse
      : destination.id === "travel-kit" ? legacy["travel-kit"]
      : destination.id === "bank" ? legacy.bank : undefined;
    const icon = destination.icon ?? defaults?.icon;
    if (!icon) throw new Error("WORKSPACE_NAVIGATION_ICON_REQUIRED");
    const appearance = icon === "catalog" || icon === "panels" ? "bank" : icon === "backpack" ? "travel-kit" : "browse";
    const label = destination.group ?? defaults?.group ?? (appearance === "bank" ? "Developer" : "Explore");
    let group = groups.find(item => item.label === label);
    if (!group) { group = { label, items: [] }; groups.push(group); }
    group.items.push({ ...destination, icon, appearance });
  }
  return groups;
}
