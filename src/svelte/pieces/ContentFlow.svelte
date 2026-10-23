<script lang="ts">
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import StackLayout from "./StackLayout.svelte";
  import PlaceHeading from "./PlaceHeading.svelte";
  import InspectionContent from "../views/InspectionContent.svelte";
  import ViewItem from "../views/ViewItem.svelte";
  import MediaContent from "../views/MediaContent.svelte";
  import Appearance from "./Appearance.svelte";
  import Identity from "./Identity.svelte";
  import ViewAttention from "../views/ViewAttention.svelte";
  import ViewRelatedSelection from "../views/ViewRelatedSelection.svelte";
  import Information from "./Information.svelte";
  import Feedback from './Feedback.svelte';
  import { groupRelatedItems } from "../../interaction/content-groups.ts";
  import { revealSearchTarget } from "../explorer/catalog-search-focus.ts";
  let { resolved, onevent, album = null, onalbum = () => {}, host = "page" }: {
    resolved: ResolvedView; onevent: (event: BankEvent) => void;
    album?: string | null; onalbum?: (id: string) => void; host?: "page" | "panel";
  } = $props();
  let bank = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> } | null>(null);
  let media = $state<{ select: (record: string) => boolean } | null>(null);
  export async function revealEntry(id: PrimitiveId) { return await bank?.revealEntry(id) ?? null; }
  export async function revealAndFocusEntry(id: PrimitiveId) {
    const target = await revealEntry(id);
    if (target) revealSearchTarget(target, target.closest<HTMLElement>("[data-catalog-scroll]"));
  }
  export function selectMedia(record: string) { return media?.select(record) ?? false; }
  let hasCatalog = $derived(resolved.view.content.some(item => item.kind === "visual-catalog" || item.kind === "media-library"));
</script>

<!-- Catalog-owned vertical content flow. Callers provide descriptors and events,
     never wrappers, classes, styles, HTML attributes or replacement render slots. -->
{#snippet sequence()}
  {#if resolved.connection?.state === 'offline'}
    <StackLayout title="Connection"><Feedback text={`${resolved.connection.label} Loaded content remains available; changes are not sent while disconnected.`} /></StackLayout>
  {/if}
  {#each resolved.view.content as item, index (index)}
    {#if item.kind === "header"}
      <!-- Main headers belong to the workspace. Explicit panel media reuses the
           same content heading; ordinary panel identity stays in its toolbar. -->
      {#if host === "panel" && item.media}<PlaceHeading identity={{...item, subtitle:item.subtitle ?? ""}} />{/if}
    {:else if item.kind === "stack"}
      <div data-view-item={item.id}>
      <StackLayout title={item.title} description={item.description}>
        {#each groupRelatedItems(item.items) as group, groupIndex (groupIndex)}
          {#if group[0]?.kind === "fact"}<Information items={group.filter(child => child.kind === "fact")} />
          {:else}{#each group as child}<ViewItem item={child} {resolved} {onevent} />{/each}{/if}
        {/each}
      </StackLayout>
      </div>
    {:else if item.kind === "visual-catalog"}
      <InspectionContent bind:this={bank} />
    {:else if item.kind === "media-library"}
      <MediaContent bind:this={media} library={item.library} {album} {onalbum} />
    {:else if item.kind === "appearance"}
      <Appearance />
    {:else if item.kind === "identity"}
      <Identity />
    {:else if item.kind === "attention"}
      <ViewAttention state={resolved.attention ?? { loaded:false, items:[], error:null,objectSignals:{} }} {onevent} />
    {:else if item.kind === "navigation" || item.kind === "destination"}
      {@const invalidWorkspaceContent = (() => { throw new Error("WORKSPACE_CONTENT_OUTSIDE_WORKSPACE"); })()}
    {:else}<ViewItem {item} {resolved} {onevent} host={host === "panel" ? "frame" : "flow"} />{/if}
  {/each}
  {#if host === "panel" && resolved.relations?.groups.length}<ViewRelatedSelection state={resolved.relations} {onevent} />{/if}
{/snippet}
{#if host === "panel"}{@render sequence()}
{:else}<div class:place-content={!hasCatalog} data-content-layout={resolved.view.layout} data-view-content={resolved.view.id}>{@render sequence()}</div>{/if}
