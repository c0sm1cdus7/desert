<script lang="ts">
  import Archive from "@lucide/svelte/icons/archive";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Calendar from "@lucide/svelte/icons/calendar";
  import Captions from "@lucide/svelte/icons/captions";
  import Check from "@lucide/svelte/icons/check";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";
  import CircleX from "@lucide/svelte/icons/circle-x";
  import Ellipsis from "@lucide/svelte/icons/ellipsis";
  import Eye from "@lucide/svelte/icons/eye";
  import FileText from "@lucide/svelte/icons/file-text";
  import Film from "@lucide/svelte/icons/film";
  import ImageOff from "@lucide/svelte/icons/image-off";
  import Images from "@lucide/svelte/icons/images";
  import Info from "@lucide/svelte/icons/info";
  import Landmark from "@lucide/svelte/icons/landmark";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import Lock from "@lucide/svelte/icons/lock";
  import Minus from "@lucide/svelte/icons/minus";
  import Music2 from "@lucide/svelte/icons/music-2";
  import Palette from "@lucide/svelte/icons/palette";
  import PanelLeft from "@lucide/svelte/icons/panel-left";
  import PanelsTopLeft from "@lucide/svelte/icons/panels-top-left";
  import Pause from "@lucide/svelte/icons/pause";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Play from "@lucide/svelte/icons/play";
  import Plus from "@lucide/svelte/icons/plus";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import Save from "@lucide/svelte/icons/save";
  import Search from "@lucide/svelte/icons/search";
  import Settings from "@lucide/svelte/icons/settings";
  import Shuffle from "@lucide/svelte/icons/shuffle";
  import Undo2 from "@lucide/svelte/icons/undo-2";
  import Volume2 from "@lucide/svelte/icons/volume-2";
  import VolumeX from "@lucide/svelte/icons/volume-x";
  import X from "@lucide/svelte/icons/x";
  import type { CatalogProps } from "../../types.d.ts";
  let { name, decorative, placement, chevron, destination, search, tone, size, leading }: CatalogProps<"icon"> = $props();
  const toneClass = { success: "text-success", warning: "text-warning" } as const;
  let glyphClass = $derived([tone && toneClass[tone], leading === "list" && "mt-0.5 size-4 shrink-0"].filter(Boolean).join(" "));
  // The glyph gets exactly the attributes the props ask for, nothing undefined: lucide hides an icon by itself when it
  // receives no aria attribute at all, so an absent `decorative` must stay absent.
  let attributes = $derived({
    ...decorative ? { "aria-hidden": "true" as const } : {},
    ...placement ? { "data-icon": placement } : {},
    ...chevron ? { "data-control-chevron": true } : {},
    ...destination ? { "data-destination-chevron": true } : {},
    ...search ? { "data-search-icon": search } : {},
    ...glyphClass ? { class: glyphClass } : {},
    ...size === "em" ? { size: "1em" } : {},
  });
</script>

{#if name === "archive"}<Archive {...attributes} />
{:else if name === "arrow-left"}<ArrowLeft {...attributes} />
{:else if name === "arrow-right"}<ArrowRight {...attributes} />
{:else if name === "backpack"}<Backpack {...attributes} />
{:else if name === "calendar"}<Calendar {...attributes} />
{:else if name === "captions"}<Captions {...attributes} />
{:else if name === "check"}<Check {...attributes} />
{:else if name === "chevron-down"}<ChevronDown {...attributes} />
{:else if name === "chevron-left"}<ChevronLeft {...attributes} />
{:else if name === "chevron-right"}<ChevronRight {...attributes} />
{:else if name === "circle-alert"}<CircleAlert {...attributes} />
{:else if name === "circle-check"}<CircleCheck {...attributes} />
{:else if name === "circle-question-mark"}<CircleQuestionMark {...attributes} />
{:else if name === "circle-x"}<CircleX {...attributes} />
{:else if name === "ellipsis"}<Ellipsis {...attributes} />
{:else if name === "eye"}<Eye {...attributes} />
{:else if name === "file-text"}<FileText {...attributes} />
{:else if name === "film"}<Film {...attributes} />
{:else if name === "image-off"}<ImageOff {...attributes} />
{:else if name === "images"}<Images {...attributes} />
{:else if name === "info"}<Info {...attributes} />
{:else if name === "landmark"}<Landmark {...attributes} />
{:else if name === "layout-grid"}<LayoutGrid {...attributes} />
{:else if name === "loader-circle"}<LoaderCircle {...attributes} />
{:else if name === "lock"}<Lock {...attributes} />
{:else if name === "minus"}<Minus {...attributes} />
{:else if name === "music-2"}<Music2 {...attributes} />
{:else if name === "palette"}<Palette {...attributes} />
{:else if name === "panel-left"}<PanelLeft {...attributes} />
{:else if name === "panels-top-left"}<PanelsTopLeft {...attributes} />
{:else if name === "pause"}<Pause {...attributes} />
{:else if name === "pencil"}<Pencil {...attributes} />
{:else if name === "play"}<Play {...attributes} />
{:else if name === "plus"}<Plus {...attributes} />
{:else if name === "rotate-cw"}<RotateCw {...attributes} />
{:else if name === "save"}<Save {...attributes} />
{:else if name === "search"}<Search {...attributes} />
{:else if name === "settings"}<Settings {...attributes} />
{:else if name === "shuffle"}<Shuffle {...attributes} />
{:else if name === "undo-2"}<Undo2 {...attributes} />
{:else if name === "volume-2"}<Volume2 {...attributes} />
{:else if name === "volume-x"}<VolumeX {...attributes} />
{:else if name === "x"}<X {...attributes} />
{/if}
