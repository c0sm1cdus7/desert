// One witness per state of StackLayout (plain, described, required), each with its title visible and with its title
// kept for assistive technology only.
import type { CatalogSpecimen } from "../../types.d.ts";

export const StackLayoutSpecimens = [
  { state: "default", variants: { headingVisibility: "visible" }, props: { title: "Appearance", headingVisibility: "visible" } },
  { state: "default", variants: { headingVisibility: "accessible" }, props: { title: "Text size", headingVisibility: "accessible" } },
  { state: "described", variants: { headingVisibility: "visible" }, props: { title: "Connection",
    description: "Changes are sent when the connection returns.", headingVisibility: "visible" } },
  { state: "described", variants: { headingVisibility: "accessible" }, props: { title: "Connection",
    description: "Changes are sent when the connection returns.", headingVisibility: "accessible" } },
  { state: "required", variants: { headingVisibility: "visible" }, props: { title: "Your identity", required: true,
    headingVisibility: "visible" } },
  { state: "required", variants: { headingVisibility: "accessible" }, props: { title: "Your identity", required: true,
    headingVisibility: "accessible" } },
] as const satisfies readonly CatalogSpecimen<"stack-layout">[];
