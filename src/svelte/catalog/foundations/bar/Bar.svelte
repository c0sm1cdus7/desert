<script lang="ts">
  import { Action, Availability, Face, Menu } from "../../index.ts";
  import { intentKey } from "../../../../interaction/intent.ts";
  import type { BarCommand } from "../../../infra/bar-command.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { useToolbarScroll } from "../../mechanisms/toolbar-scroll/toolbar-scroll.svelte.ts";
  import BarIdentity from "./BarIdentity.svelte";
  import BarSearch from "./BarSearch.svelte";
  import { useToolbarCommands } from "./toolbar-commands.svelte.ts";
  import { useToolbarLeading } from "./toolbar-leading.svelte.ts";
  let { edge, purpose, identity, identityRole, face, leading, trailing, group, primary, secondary, availability, search,
    navigationToggle, settingsPlaceholder, layer, inert, oninvoke, onquery, onsearchopen, onsearchcancel, onnavigationtoggle }:
    CatalogProps<"bar"> = $props();
  const uid = $props.id();
  let element = $state<HTMLElement | null>(null), row = $state<HTMLDivElement | null>(null);
  let leadingElement = $state<HTMLDivElement | null>(null), utilities = $state<HTMLDivElement | null>(null);
  // A top command rail measures its trailing commands into the room its identity leaves; the rest overflow.
  let rail = $derived(edge === "top" && purpose === "commands" && layer !== "search");
  let reservesSearch = $derived(layer === "content" && search !== undefined);
  let groupedOpen = $state(false), returnFocused = $state(false);
  const commands = useToolbarCommands(() => rail && !group ? trailing : [],
    () => ({ row, leading: leadingElement, utilities, controls: null }), () => Boolean(primary) || reservesSearch);
  const leadingControls = useToolbarLeading(() => leadingElement);
  const scroll = useToolbarScroll(() => element, () => edge);
  let stacked = $derived(rail && commands.stacked);
  const invoke = (command: BarCommand) => { if (!command.submit) oninvoke?.(command.intent); };
</script>

{#snippet command(value: BarCommand, emphasis: "primary" | "secondary", shown: "icon" | "text")}
  <Action label={value.label} icon={value.icon} state={value.state} reason={value.reason} {emphasis} face={shown}
    type={value.submit ? "submit" : "button"} form={value.submit} onclick={() => invoke(value)} />
{/snippet}

<div bind:this={element} class={edge === "top" ? "workspace-header" : "bank-footer"} data-piece="toolbar" data-toolbar={edge}
  data-surface-slot={edge} data-toolbar-purpose={purpose} data-toolbar-overlay={layer} data-identity-role={identityRole}
  data-place-toolbar={layer === "content" || undefined} data-catalog-toolbar={layer === "search" || undefined}
  data-searching={search?.open} {inert} aria-hidden={inert || undefined} data-toolbar-return={scroll.available || undefined}>
  {#if scroll.available || returnFocused}
    <!-- A transparent return target: the whole top rail scrolls its surface back to the top. -->
    <button type="button" class="sr-only" data-toolbar-scroll-top onclick={scroll.returnToTop}
      onfocus={() => { returnFocused = true; }} onblur={() => { returnFocused = false; }}>Back to top</button>
  {/if}
  {#if face}
    <div class="toolbar-face flex justify-center" data-toolbar-face><Face {face} /></div>
  {/if}
  <div bind:this={row} class={stacked ? "toolbar-row flex-wrap" : "toolbar-row"} data-reserve-search={reservesSearch || undefined}
    data-toolbar-layout={stacked ? "stacked" : "inline"} data-toolbar-has-leading={leadingControls.occupied || undefined}>
    {#if rail}<div bind:this={leadingElement} data-toolbar-leading data-occupied={leadingControls.occupied || undefined}>
      {#if leading && identityRole !== "message"}
        <div class="toolbar-action" data-toolbar-navigation data-toolbar-command={intentKey(leading.intent)}>{@render command(leading, "secondary", "icon")}</div>
      {/if}
    </div>{/if}
    {#if identity}<BarIdentity title={identity.title} subtitle={identity.subtitle} role={identityRole} />{/if}
    {#if rail && (trailing.length || primary)}
      <div bind:this={utilities} class="ml-auto flex min-w-0 shrink-0" data-toolbar-utilities>
        {#if group && trailing.length}<div class="toolbar-action" data-toolbar-create>
          <Menu label="Create" icon="create" actions={trailing} open={groupedOpen} align="end"
            onopenchange={open => groupedOpen = open} oninvoke={intent => oninvoke?.(intent)} />
        </div>{:else}
          {#each trailing.slice(0, commands.visibleCount) as value (intentKey(value.intent))}
            <div class="toolbar-action" data-toolbar-command={intentKey(value.intent)}>{@render command(value, "secondary", "icon")}</div>
          {/each}
          {#if commands.overflow.length}<div class="toolbar-action" data-toolbar-overflow>
            <Menu label="More actions" icon="more" actions={commands.overflow} open={commands.open} align="end"
              onopenchange={commands.change} oninvoke={intent => oninvoke?.(intent)} />
          </div>{/if}
        {/if}
        {#if primary}<div class="toolbar-action" data-toolbar-primary data-toolbar-command={intentKey(primary.intent)}>
          {@render command(primary, "primary", "icon")}
        </div>{/if}
      </div>
    {:else if edge === "bottom" && (purpose === "commit" || purpose === "steps")}
      {#if secondary}{@render command(secondary, "secondary", "text")}{/if}
      {#if primary}{@render command(primary, "primary", "text")}{/if}
    {:else if navigationToggle || settingsPlaceholder}
      {#if navigationToggle}
        <div class="toolbar-action" data-navigation-toggle>
          <Action label={navigationToggle.expanded ? "Hide navigation" : "Show navigation"} icon="navigation" face="icon" emphasis="secondary"
            state="ready" type="button" onclick={() => onnavigationtoggle?.()} disclosure={{ id: `${uid}-navigation`,
              controls: navigationToggle.controls, expanded: navigationToggle.expanded, haspopup: "dialog" }} />
        </div>
      {/if}
      {#if settingsPlaceholder}
        <div class="toolbar-action" data-settings-placeholder>
          <Action label="Settings" icon="settings" face="icon" emphasis="secondary" state="unavailable" type="button"
            reason="Settings — not available in this preview" />
        </div>
      {/if}
    {:else if search && layer !== "content"}
      <BarSearch title={search.title} query={search.query} open={search.open} resultsId={search.resultsId}
        onquery={value => onquery?.(value)} onopen={() => onsearchopen?.()} oncancel={() => onsearchcancel?.()} />
    {/if}
  </div>
  {#if edge === "top" && availability}<div class="toolbar-availability" title={availability.label}>
    <Availability state={availability.state} label={availability.label} />
  </div>{/if}
</div>
