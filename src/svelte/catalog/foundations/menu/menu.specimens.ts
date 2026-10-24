// One witness of Menu per state: the overflow trigger closed, and open on two commands (one not available now).
import type { CatalogSpecimen } from "../../types.d.ts";

export const MenuSpecimens = [
  { state: "closed", props: { label: "More actions", icon: "more", open: false, align: "end", actions: [
    { intent: { kind: "journey", journey: "archive-note" }, label: "Archive note", icon: "archive", state: "ready" },
  ] } },
  { state: "open", props: { label: "More actions", icon: "more", open: true, align: "end", actions: [
    { intent: { kind: "journey", journey: "archive-note" }, label: "Archive note", icon: "archive", state: "ready" },
    { intent: { kind: "journey", journey: "restore-note" }, label: "Restore note", icon: "restore", state: "unavailable",
      reason: "Only archived notes can be restored" },
  ] } },
] as const satisfies readonly CatalogSpecimen<"menu">[];
