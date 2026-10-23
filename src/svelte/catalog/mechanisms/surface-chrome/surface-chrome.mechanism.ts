// Shared stylesheet imported by theme.css; owned by the theme until its foundation claims it (slices 2-4).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const SurfaceChromeMechanism = defineMechanism({ id: "surface-chrome", owner: "theme", files: ["surface-chrome.css"] } as const);
