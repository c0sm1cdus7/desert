// One witness per purpose (a frame's top commands, a commit pair, a steps pair, the navigation pane's identity), the
// place search while it is open, and a command rail too narrow for its commands, which overflow into one menu.
import type { CatalogSpecimen } from "../../types.d.ts";

export const BarSpecimens = [
  { state: "default", variants: { purpose: "commands" }, props: { edge: "top", purpose: "commands",
    identity: { title: "Weekly plan", subtitle: "Edited today" }, identityRole: "heading",
    leading: { label: "Back", icon: "back", state: "ready", intent: { kind: "back" } },
    trailing: [{ label: "Review", icon: "review", state: "ready", intent: { kind: "view.output", view: "notes", output: "review" } }], primary: { label: "Save", icon: "save", state: "ready", intent: { kind: "view.output", view: "notes", output: "save" } },
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
    trailing: [{ label: "Create", icon: "create", state: "ready", intent: { kind: "view.output", view: "notes", output: "create" } }, { label: "Archive", icon: "archive", state: "ready", intent: { kind: "view.output", view: "notes", output: "archive" } }, { label: "Review", icon: "review", state: "ready", intent: { kind: "view.output", view: "notes", output: "review" } },
      { label: "Save", icon: "save", state: "ready", intent: { kind: "view.output", view: "notes", output: "save" } }, { label: "Open", icon: "open", state: "ready", intent: { kind: "view.output", view: "notes", output: "open" } }, { label: "Media", icon: "media", state: "ready", intent: { kind: "view.output", view: "notes", output: "media" } }],
    settingsPlaceholder: false, inert: false } },
] as const satisfies readonly CatalogSpecimen<"bar">[];
