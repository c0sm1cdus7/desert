// Menu: an icon trigger that reveals commands beside their readable labels in a popover aligned to its end; choosing
// one closes the menu and invokes it. It replaces the toolbar's speed dial.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MenuContract } from "./menu.contract.ts";

export const Menu = defineFoundation({
  id: "menu",
  purpose: "Reveal overflowing contextual commands beside their readable labels, without putting content navigation in the toolbar.",
  owner: { entry: "Menu.svelte", parts: ["menu.css"] },
  shape: "radius", states: ["closed", "open"], approval: "required", contract: MenuContract,
} as const);
