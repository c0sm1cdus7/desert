// DrawerGrip: the handle at the top of a bottom-edge drawer or sheet; dragging it down or pressing it closes the surface.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DrawerGripContract } from "./drawer-grip.contract.ts";

export const DrawerGrip = defineFoundation({
  id: "drawer-grip",
  purpose: "The handle of a bottom-edge drawer that closes it by drag or press, disabled while the drawer is locked.",
  owner: { entry: "DrawerGrip.svelte" },
  shape: "none", states: ["default", "locked"], approval: "required", contract: DrawerGripContract,
} as const);
