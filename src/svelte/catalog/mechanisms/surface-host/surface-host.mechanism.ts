// Surface host: a portalled transient measures the surface that launched it (inline and block space, text size, the
// adaptive reservation), never the window. Owned by modal; popover, surface and shell list it in owner.mechanisms (design §2).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const SurfaceHostMechanism = defineMechanism({ id: "surface-host", owner: "modal", files: ["surface-host.svelte.ts"] } as const);
