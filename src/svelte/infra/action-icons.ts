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
import PanelLeft from "@lucide/svelte/icons/panel-left";
import Images from "@lucide/svelte/icons/images";
import Pencil from "@lucide/svelte/icons/pencil";
import Settings from "@lucide/svelte/icons/settings";
import Palette from "@lucide/svelte/icons/palette";
import Lock from "@lucide/svelte/icons/lock";
import Undo2 from "@lucide/svelte/icons/undo-2";
import type { ActionIcon } from "../../interaction/toolbar.ts";

export const actionIcons = {
  back: ArrowLeft, close: X, save: Save, review: Eye, recover: Search, retry: RotateCw,
  create: Plus, archive: Archive, catalog: LayoutGrid, open: ArrowRight, confirm: Check, search: Search, more: Ellipsis, navigation: PanelLeft,
  media: Images, edit: Pencil, settings: Settings, lock: Lock, restore: Undo2, palette: Palette,
} satisfies Record<ActionIcon, typeof X>;
