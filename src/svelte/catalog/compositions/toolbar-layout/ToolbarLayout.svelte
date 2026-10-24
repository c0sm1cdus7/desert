<script lang="ts">
  import { Face } from "../../index.ts";
  import { cn } from "../../../vendor/utils.js";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { useToolbarScroll } from "../../../infra/toolbar-scroll.svelte.ts";
  import ToolbarIdentity from "./ToolbarIdentity.svelte";
  import type { ToolbarIdentityContent, ToolbarIdentityRole } from "./toolbar-identity.ts";
  import { useToolbarLeading } from "./toolbar-leading.svelte.ts";
  import type { ToolbarContent } from "../../../infra/toolbar-content.ts";
  import { useToolbarCommands } from "./toolbar-commands.svelte.ts";
  import { intentKey, submitsJourney } from "../../../../interaction/intent.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { NodeRenderer } from "../../index.ts";
  import { SpeedDial } from "../../index.ts";
  import { ToolbarSearch } from "../../index.ts";
  import { ToolbarMediaControls } from "../../index.ts";
  import { ZoomControls } from "../../index.ts";
  import { PlaybackControls } from "../../index.ts";
  import CatalogNavigationActions from "./CatalogNavigationActions.svelte";
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Icon } from "../../index.ts";

  let { content, identity: suppliedIdentity, identityRole: suppliedRole = "heading", onidentityElement, oncloseElement,
    edge: suppliedEdge = "top", layer, inert = false, searching, drag }: {
    content: ToolbarContent;
    identity?: ToolbarIdentityContent; identityRole?: ToolbarIdentityRole;
    onidentityElement?: (element: HTMLDivElement | null) => void;
    oncloseElement?: (element: HTMLButtonElement | null) => void;
    edge?: "top" | "bottom"; layer?: "content" | "search"; inert?: boolean; searching?: boolean;
    drag?: { down: (event: PointerEvent) => void; move: (event: PointerEvent) => void;
      up: (event: PointerEvent) => void; cancel: (event: PointerEvent) => void; lost: (event: PointerEvent) => void };
  } = $props();
  let element = $state<HTMLElement | null>(null);
  let leadingElement = $state<HTMLDivElement | null>(null);
  let row = $state<HTMLDivElement | null>(null), leadingRail = $state<HTMLDivElement | null>(null);
  let utilities = $state<HTMLDivElement | null>(null), customControls = $state<HTMLDivElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let toolbar = $derived(content.kind === "commands" ? content.toolbar : undefined);
  let trailing = $derived(content.kind === "place-navigation" ? content.topActions ?? [] : toolbar?.edge === "top" ? toolbar.trailing ?? [] : []);
  let primary = $derived(toolbar?.edge === "top" ? toolbar.primary : undefined);
  let actionGroup = $derived(content.kind === "place-navigation" ? content.actionGroup : toolbar?.edge === "top" ? toolbar.actionGroup : undefined);
  let groupedOpen = $state(false);
  const commands = useToolbarCommands(() => actionGroup ? [] : trailing, () => ({row,leading:leadingElement,utilities,controls:customControls}), () => Boolean(primary) || content.kind === "place-navigation" && content.searchAvailable === true);
  let edge = $derived(toolbar?.edge ?? (content.kind === "media-controls" || content.kind === "settings-placeholder" ? "bottom" : suppliedEdge));
  let purpose = $derived(content.kind === "media-controls" ? "media" : toolbar?.edge === "bottom" ? toolbar.navigation === "steps" ? "steps" : "commit" : "commands");
  let stacked = $derived(content.kind === "commands" || content.kind === "place-navigation" ? commands.stacked : content.kind === "media-controls" && content.items[content.index]?.kind !== "image");
  let face = $derived(toolbar?.edge === "top" ? toolbar.face : undefined);
  let identity = $derived(toolbar?.edge === "top" ? {title:toolbar.title,subtitle:toolbar.subtitle} : suppliedIdentity);
  let identityRole = $derived(content.kind === "commands" ? content.presentation === "message" ? "message" : "heading" : suppliedRole);
  let leading = $derived(toolbar?.edge === "top" || content.kind === "place-navigation" || content.kind === "media-header");
  const event = (value: NodeEvent) => {
    if (content.kind === "actions") content.onevent(value);
    else if (value.kind === "surface.invoke" && (content.kind === "commands" || content.kind === "place-navigation")) content.invoke?.(value.intent);
  };
  $effect(() => { oncloseElement?.(closeButton); return () => oncloseElement?.(null); });
  const leadingControls = useToolbarLeading(() => leadingElement);
  let returnFocused = $state(false);
  const scroll = useToolbarScroll(() => element, () => edge);
</script>

<div bind:this={element} class={edge === "top" ? "workspace-header" : "bank-footer"} data-piece="toolbar" data-toolbar={edge}
  data-surface-slot={edge} data-toolbar-purpose={purpose} data-toolbar-overlay={layer || undefined}
  data-place-toolbar={layer === "content" || undefined} data-catalog-toolbar={layer === "search" || undefined}
  data-searching={searching} {inert} aria-hidden={inert || undefined} data-navigation-drag={drag ? true : undefined}
  onpointerdown={drag?.down} onpointermove={drag?.move} onpointerup={drag?.up}
  onpointercancel={drag?.cancel} onlostpointercapture={drag?.lost}
  data-toolbar-return={scroll.available || undefined}>
  {#if scroll.available || returnFocused}
    <Button variant="secondary" presentation="toolbar-return" onclick={scroll.returnToTop}
      onfocus={() => { returnFocused = true; }} onblur={() => { returnFocused = false; }}>Back to top</Button>
  {/if}
  {#if face}
    <div class="toolbar-face flex justify-center" data-toolbar-face><Face {face} /></div>
  {/if}
  <div bind:this={row} class={cn("toolbar-row", stacked && "flex-wrap")} data-reserve-search={content.kind === "place-navigation" && content.searchAvailable || undefined}
    data-toolbar-layout={stacked ? "stacked" : "inline"} data-toolbar-has-leading={leadingControls.occupied || undefined}>
    {#if leading}<div bind:this={leadingElement} data-toolbar-leading data-occupied={leadingControls.occupied || undefined}>
      {#if content.kind === "commands" && toolbar?.edge === "top" && toolbar.leading && content.presentation !== "message"}
        <div bind:this={leadingRail} class="toolbar-action" data-toolbar-navigation data-toolbar-command={intentKey(toolbar.leading.intent)}>
          <NodeRenderer node={{version:"desert.bank-node/1",kind:"action",action:toolbar.leading,role:"secondary"}} onevent={event} />
        </div>
      {:else if content.kind === "place-navigation"}
        <CatalogNavigationActions detail={content.detail} onback={content.onback} backAvailable={content.backAvailable} />
      {:else if content.kind === "media-header"}
        <Button onready={element=>closeButton=element instanceof HTMLButtonElement ? element : null} variant="secondary" size="icon-lg" aria-label="Close media viewer" onclick={content.close}><Icon name="x" /></Button>
      {/if}
    </div>{/if}
    {#if identity}<ToolbarIdentity {identity} {identityRole} onelement={onidentityElement} />{/if}
    {#if content.kind === "place-navigation" || content.kind === "commands" && toolbar?.edge === "top"}
      {#if trailing.length || primary}
        <div bind:this={utilities} class="ml-auto flex min-w-0 shrink-0" data-toolbar-utilities>
          {#if actionGroup && trailing.length}<div class="toolbar-action" data-toolbar-create>
            <SpeedDial kind="create" actions={trailing} open={groupedOpen} onchange={open=>groupedOpen=open}
              invoke={intent=>{if(content.kind === "commands" || content.kind === "place-navigation")content.invoke?.(intent);}} />
          </div>{:else}
          {#each trailing.slice(0,commands.visibleCount) as action (intentKey(action.intent))}
            <div class="toolbar-action" data-toolbar-command={intentKey(action.intent)}><NodeRenderer node={{version:"desert.bank-node/1",kind:"action",action,role:"secondary"}} onevent={event} /></div>
          {/each}
          {#if commands.overflow.length}<div class="toolbar-action" data-toolbar-overflow>
            <SpeedDial actions={commands.overflow} open={commands.open} onchange={commands.change}
              invoke={intent => { if(content.kind === "commands" || content.kind === "place-navigation") content.invoke?.(intent); }} />
          </div>{/if}
          {/if}
          {#if primary && content.kind === "commands"}<div class="toolbar-action" data-toolbar-primary data-toolbar-command={intentKey(primary.intent)}>
            <NodeRenderer node={{version:"desert.bank-node/1",kind:"action",action:primary,role:"primary",form:submitsJourney(primary.intent,content.submit)}} onevent={event}/>
          </div>{/if}
        </div>
      {/if}
    {:else if content.kind === "commands" && toolbar?.edge === "bottom"}
      {#if toolbar.secondary}<NodeRenderer node={{version:"desert.bank-node/1",kind:"action",action:toolbar.secondary,role:"secondary"}} onevent={event} />{/if}
      {#if toolbar.primary}<NodeRenderer node={{version:"desert.bank-node/1",kind:"action",action:toolbar.primary,role:"primary",form:submitsJourney(toolbar.primary.intent,content.submit)}} onevent={event} />{/if}
    {:else if content.kind === "actions"}
      {#each content.actions as action}<NodeRenderer node={{version:"desert.bank-node/1",kind:"action",action,role:"secondary"}} onevent={event} />{/each}
    {:else if content.kind === "navigation-toggle"}
      <Sidebar.Trigger variant="secondary" size="icon" aria-label={content.show ? "Show navigation" : "Hide navigation"} title={content.show ? "Show navigation" : "Hide navigation"} inert={content.searching} aria-hidden={content.searching} />
    {:else if content.kind === "settings-placeholder"}
      <Button variant="secondary" size="icon" aria-label="Settings" title="Settings — not available in this preview" disabled><Icon name="settings" decorative /></Button>
    {:else if content.kind === "search"}<ToolbarSearch {content} />
    {:else if content.kind === "media-header" && content.zoom}<ZoomControls scale={content.zoom.scale} onzoom={content.zoom.onzoom} onreset={content.zoom.onreset} />
    {:else if content.kind === "media-controls"}<ToolbarMediaControls {content} />{/if}
  </div>
  {#if toolbar?.edge === "top" && toolbar.availability}<div class="toolbar-availability" title={toolbar.availability.label}>
    <NodeRenderer node={{version:"desert.bank-node/1",kind:"availability",...toolbar.availability}} />
  </div>{/if}
  {#if content.kind === "media-controls" && content.items[content.index]?.kind !== "image"}<PlaybackControls playback={content.playback} part="seek" />{/if}
</div>
