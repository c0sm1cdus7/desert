// One witness per kind × tone; between them every optional prop is shown once.
import type { CatalogSpecimen } from "../../types.d.ts";

export const TextSpecimens = [
  { state: "default", variants: { kind: "body", tone: "default" }, props: { text: "A paragraph of reading text.", kind: "body", tone: "default", inset: "row" } },
  { state: "default", variants: { kind: "body", tone: "muted" }, props: { text: "A paragraph of reading text.", kind: "body", tone: "muted", weight: "medium" } },
  { state: "default", variants: { kind: "body", tone: "destructive" }, props: { text: "That name is already taken.", kind: "body", tone: "destructive" } },
  { state: "default", variants: { kind: "support", tone: "default" }, props: { text: "Your changes were saved.", kind: "support", tone: "default", live: "polite" } },
  { state: "default", variants: { kind: "support", tone: "muted" }, props: { text: "Your changes were saved.", kind: "support", tone: "muted" } },
  { state: "default", variants: { kind: "support", tone: "destructive" }, props: { text: "That name is already taken.", kind: "support", tone: "destructive", id: "text-specimen-error" } },
  { state: "default", variants: { kind: "caption", tone: "default" }, props: { text: "Updated a minute ago.", kind: "caption", tone: "default" } },
  { state: "default", variants: { kind: "caption", tone: "muted" }, props: { text: "Updated a minute ago.", kind: "caption", tone: "muted", align: "center" } },
  { state: "default", variants: { kind: "caption", tone: "destructive" }, props: { text: "That name is already taken.", kind: "caption", tone: "destructive" } },
] as const satisfies readonly CatalogSpecimen<"text">[];
