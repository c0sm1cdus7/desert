// Shared stylesheet imported by theme.css; owned by the theme until its foundation claims it (slices 2-4).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const CatalogProfileMechanism = defineMechanism({ id: "catalog-profile", owner: "theme", files: ["catalog-profile.css"] } as const);
