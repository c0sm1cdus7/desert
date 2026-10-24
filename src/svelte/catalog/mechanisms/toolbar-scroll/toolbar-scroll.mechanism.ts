// Toolbar scrolling (DESIGN §2): the scroll owner a surface provides and the "back to top" its top bar offers. Owned by
// bar, used by surface (and, until lanes E and F move to them, by place and the surface-frame and toolbar-layout
// compositions). It replaces infra/toolbar-scroll.svelte.ts, whose DOM no infra module may run (rule I).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const ToolbarScrollMechanism = defineMechanism({ id: "toolbar-scroll", owner: "bar", files: ["toolbar-scroll.svelte.ts"] } as const);
