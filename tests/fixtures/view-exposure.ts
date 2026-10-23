import { Notebook } from "../../products/notebook/product.ts";

type ViewExposure<S> = S extends unknown ? Omit<S, "entry" | "primaryAction" | "subjectActions"> : never;

export function viewExposure<S extends {
  kind: string; entry?: unknown; primaryAction?: unknown; subjectActions?: unknown;
}>(surface: S) {
  const { entry, primaryAction, subjectActions, ...exposure } = surface;
  return exposure as ViewExposure<S>;
}

export const ViewNotebook = { ...Notebook, surfaces: Notebook.surfaces.map(viewExposure) };
