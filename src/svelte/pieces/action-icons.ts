import ArrowLeft from "@lucide/svelte/icons/arrow-left";
import X from "@lucide/svelte/icons/x";
import Save from "@lucide/svelte/icons/save";
import Eye from "@lucide/svelte/icons/eye";
import Search from "@lucide/svelte/icons/search";
import RotateCw from "@lucide/svelte/icons/rotate-cw";
import Plus from "@lucide/svelte/icons/plus";
import Archive from "@lucide/svelte/icons/archive";
import LayoutGrid from "@lucide/svelte/icons/layout-grid";
import ArrowRight from "@lucide/svelte/icons/arrow-right";
import Check from "@lucide/svelte/icons/check";
import Ellipsis from "@lucide/svelte/icons/ellipsis";
import type { ActionIcon } from "../../interaction/toolbar.ts";

export const actionIcons = {
  back: ArrowLeft, close: X, save: Save, review: Eye, recover: Search, retry: RotateCw,
  create: Plus, archive: Archive, catalog: LayoutGrid, open: ArrowRight, confirm: Check, search: Search, more: Ellipsis,
} satisfies Record<ActionIcon, typeof X>;
