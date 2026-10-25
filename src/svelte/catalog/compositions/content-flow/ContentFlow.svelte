<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { Appearance, Identity, Information, InspectionContent, MediaContent, PlaceHeading, StackLayout, Text, ViewAttention, ViewItem,
    ViewRegion, ViewRelatedSelection } from "../../index.ts";
  import { groupRelatedItems } from "../../../../interaction/content-groups.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { resolved, onevent, album = null, onalbum, host = "page" }: CatalogProps<"content-flow"> = $props();
  // The inspection reveals and focuses its entry itself and answers whether it could; the library says whether it holds
  // the record. A caller that binds the flow asks through them.
  let bank = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean> }>();
  let media = $state<{ select: (record: string) => boolean }>();
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> { return await bank?.revealEntry(id) ?? false; }
  export async function revealAndFocusEntry(id: ResolvedNodeId): Promise<boolean> { return await revealEntry(id); }
  export function selectMedia(record: string): boolean { return media?.select(record) ?? false; }
  let hasCatalog = $derived(resolved.view.content.some(item => item.kind === "visual-catalog" || item.kind === "media-library"));
</script>

<!-- Catalog-owned vertical content flow. Callers provide descriptors and events,
     never wrappers, classes, styles, HTML attributes or replacement render slots. -->
<ViewRegion kind={host === "panel" ? "bare" : "view"} id={resolved.view.id} layout={resolved.view.layout} inset={!hasCatalog}>
  {#if resolved.connection?.state === 'offline'}
    <StackLayout title={say(m.contentFlow.connection)}>
      <Text kind="support" live="polite" text={say(m.contentFlow.offline, { label: resolved.connection.label })} />
    </StackLayout>
  {/if}
  {#each resolved.view.content as item, index (index)}
    {#if item.kind === "header"}
      <!-- Main headers belong to the workspace. Explicit panel media reuses the
           same content heading; ordinary panel identity stays in its toolbar. -->
      {#if host === "panel" && item.media}<PlaceHeading context="place" title={item.title} subtitle={item.subtitle} media={item.media} />{/if}
    {:else if item.kind === "stack"}
      <ViewRegion kind="item" id={item.id}>
      <StackLayout title={item.title} description={item.description}>
        {#each groupRelatedItems(item.items) as group, groupIndex (groupIndex)}
          {#if group[0]?.kind === "fact"}<Information items={group.filter(child => child.kind === "fact")} />
          {:else}{#each group as child}<ViewItem item={child} {resolved} {onevent} />{/each}{/if}
        {/each}
      </StackLayout>
      </ViewRegion>
    {:else if item.kind === "visual-catalog"}
      <InspectionContent bind:this={bank} />
    {:else if item.kind === "media-library"}
      <MediaContent bind:this={media} library={item.library} {album} onalbum={id => onalbum?.(id)} />
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
</ViewRegion>
