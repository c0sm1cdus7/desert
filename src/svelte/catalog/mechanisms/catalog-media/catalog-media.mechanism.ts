// Shared stylesheet imported by theme.css; owned by the theme until its foundation claims it (slices 2-4).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const CatalogMediaMechanism = defineMechanism({ id: "catalog-media", owner: "theme", files: ["catalog-media.css"] } as const);
