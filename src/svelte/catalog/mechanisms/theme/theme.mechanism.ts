// Shared stylesheet imported by theme.css; owned by the theme until its foundation claims it (slices 2-4).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const ThemeMechanism = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);
