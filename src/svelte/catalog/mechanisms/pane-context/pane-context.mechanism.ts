// Pane context: an edge pane tells what it holds whether its header drags it and whether a piece sits in a frame inside
// it (DESIGN §2, the surface-chrome drawer rules as props). Owned by modal; bar, surface and shell list it in owner.mechanisms.
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const PaneContextMechanism = defineMechanism({ id: "pane-context", owner: "modal", files: ["pane-context.svelte.ts"] } as const);
