// One witness per state of StackLayout (plain, described, required), each with its title visible and with its title
// kept for assistive technology only, on the row inset and on the group's edge.
import type { CatalogSpecimen } from "../../types.d.ts";

export const StackLayoutSpecimens = [
  { state: "default", variants: { headingVisibility: "visible", titleAxis: "row" }, props: { title: "Appearance", headingVisibility: "visible", titleAxis: "row" } },
  { state: "default", variants: { headingVisibility: "accessible", titleAxis: "row" }, props: { title: "Text size", headingVisibility: "accessible", titleAxis: "row" } },
  { state: "described", variants: { headingVisibility: "visible", titleAxis: "row" }, props: { title: "Connection",
    description: "Changes are sent when the connection returns.", headingVisibility: "visible", titleAxis: "row" } },
  { state: "described", variants: { headingVisibility: "accessible", titleAxis: "row" }, props: { title: "Connection",
    description: "Changes are sent when the connection returns.", headingVisibility: "accessible", titleAxis: "row" } },
  { state: "required", variants: { headingVisibility: "visible", titleAxis: "row" }, props: { title: "Your identity", required: true,
    headingVisibility: "visible", titleAxis: "row" } },
  { state: "required", variants: { headingVisibility: "accessible", titleAxis: "row" }, props: { title: "Your identity", required: true,
    headingVisibility: "accessible", titleAxis: "row" } },
  { state: "default", variants: { headingVisibility: "visible", titleAxis: "edge" }, props: { title: "Appearance", headingVisibility: "visible", titleAxis: "edge" } },
  { state: "default", variants: { headingVisibility: "accessible", titleAxis: "edge" }, props: { title: "Text size", headingVisibility: "accessible", titleAxis: "edge" } },
  { state: "described", variants: { headingVisibility: "visible", titleAxis: "edge" }, props: { title: "Connection",
    description: "Changes are sent when the connection returns.", headingVisibility: "visible", titleAxis: "edge" } },
  { state: "described", variants: { headingVisibility: "accessible", titleAxis: "edge" }, props: { title: "Connection",
    description: "Changes are sent when the connection returns.", headingVisibility: "accessible", titleAxis: "edge" } },
  { state: "required", variants: { headingVisibility: "visible", titleAxis: "edge" }, props: { title: "Your identity", required: true,
    headingVisibility: "visible", titleAxis: "edge" } },
  { state: "required", variants: { headingVisibility: "accessible", titleAxis: "edge" }, props: { title: "Your identity", required: true,
    headingVisibility: "accessible", titleAxis: "edge" } },
] as const satisfies readonly CatalogSpecimen<"stack-layout">[];
