// One witness per purpose (a frame's top commands, a commit pair, a steps pair, the navigation pane's identity), the
// place search while it is open, and a command rail too narrow for its commands, which overflow into one menu.
import type { CatalogSpecimen } from "../../types.d.ts";

const command = (label: string, icon: "create" | "archive" | "review" | "save" | "open" | "media", output: string) =>
  ({ label, icon, state: "ready", intent: { kind: "view.output", view: "notes", output } }) as const;

export const BarSpecimens = [
  { state: "default", variants: { purpose: "commands" }, props: { edge: "top", purpose: "commands",
    identity: { title: "Weekly plan", subtitle: "Edited today" }, identityRole: "heading",
    leading: { label: "Back", icon: "back", state: "ready", intent: { kind: "back" } },
    trailing: [command("Review", "review", "review")], primary: command("Save", "save", "save"),
    availability: { state: "ready", label: "Connected" }, settingsPlaceholder: false, inert: false } },
  { state: "default", variants: { purpose: "commit" }, props: { edge: "bottom", purpose: "commit", identityRole: "heading", trailing: [],
    secondary: { label: "Cancel", icon: "close", state: "ready", intent: { kind: "close" } },
    primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } }, settingsPlaceholder: false, inert: false } },
  { state: "default", variants: { purpose: "steps" }, props: { edge: "bottom", purpose: "steps", identityRole: "heading", trailing: [],
    secondary: { label: "Back", icon: "back", state: "ready", intent: { kind: "back" } },
    primary: { label: "Continue", icon: "open", state: "unavailable", reason: "Choose a destination first.",
      intent: { kind: "journey", journey: "plan-trip" } }, settingsPlaceholder: false, inert: false } },
  { state: "default", variants: { purpose: "navigation" }, props: { edge: "top", purpose: "navigation",
    identity: { title: "Notebook", subtitle: "Your writing" }, identityRole: "heading", trailing: [], settingsPlaceholder: false, inert: false } },
  { state: "searching", variants: { purpose: "commands" }, props: { edge: "top", purpose: "commands", identityRole: "heading", trailing: [],
    search: { title: "Notes", query: "plan", open: true, resultsId: "notes-results" }, layer: "search", settingsPlaceholder: false, inert: false } },
  { state: "overflow", variants: { purpose: "commands" }, props: { edge: "top", purpose: "commands",
    identity: { title: "A deliberately descriptive place title", subtitle: "Supporting copy" }, identityRole: "heading",
    trailing: [command("Create", "create", "create"), command("Archive", "archive", "archive"), command("Review", "review", "review"),
      command("Save", "save", "save"), command("Open", "open", "open"), command("Media", "media", "media")],
    settingsPlaceholder: false, inert: false } },
] as const satisfies readonly CatalogSpecimen<"bar">[];
