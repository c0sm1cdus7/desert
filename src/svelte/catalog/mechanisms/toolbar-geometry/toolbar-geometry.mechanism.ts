// Toolbar geometry (DESIGN §2): the reading occlusion of a top or bottom bar. Owned by bar, used by surface, shell and
// field. It replaces infra/toolbar-bounds.ts, whose DOM no infra module may run (rule I).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const ToolbarGeometryMechanism = defineMechanism({ id: "toolbar-geometry", owner: "bar", files: ["toolbar-bounds.ts"] } as const);
