import type { ActionIcon } from "../../interaction/toolbar.ts";

/** Renderer-owned navigation data. No component, CSS or layout escape hatches. */
export type WorkspaceIcon = ActionIcon | "landmark" | "backpack" | "panels";
export interface WorkspaceDestination<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly shortLabel?: string;
  readonly icon?: WorkspaceIcon;
  readonly group?: string;
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
  const groups: { label: string; items: ResolvedDestination<Id>[] }[] = [
    { label: "Explore", items: [] }, { label: "Developer", items: [] },
  ];
  for (const destination of navigation) {
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
