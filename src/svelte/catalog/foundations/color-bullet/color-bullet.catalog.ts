// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ColorBulletContract } from "./color-bullet.contract.ts";

export const ColorBullet = defineFoundation({
  id: "color-bullet",
  purpose: "Show a label\u2019s color alongside its text without using color as its only meaning.",
  owner: { entry: "ColorBullet.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ColorBulletContract,
} as const);
