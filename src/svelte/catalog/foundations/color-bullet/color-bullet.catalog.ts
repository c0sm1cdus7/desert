// ColorBullet: the small dot that shows a label's color next to its text; the text, not the color, carries the meaning.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ColorBulletContract } from "./color-bullet.contract.ts";

export const ColorBullet = defineFoundation({
  id: "color-bullet",
  purpose: { key: "colorBullet.purpose" }, messages: ["colorBullet.purpose"],
  owner: { entry: "ColorBullet.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ColorBulletContract,
} as const);
