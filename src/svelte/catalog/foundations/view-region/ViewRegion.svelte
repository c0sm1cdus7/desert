<script lang="ts">
  import { untrack } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { useRegionRegistry } from "../../../infra/region-registry.ts";
  import { provideSurfaceActivity } from "../../../infra/surface-activity.svelte.ts";
  import { revealSearchTarget } from "../../mechanisms/reveal/reveal.ts";
  let { kind, id, layout, inset = false, label, visible, active = true, children }: CatalogProps<"view-region"> = $props();
  // A retained place tells its content whether it is the active surface (it absorbs the retained-place composition).
  if (untrack(() => kind) === "retained") provideSurfaceActivity(() => active);
  const registry = useRegionRegistry();
  let element = $state<HTMLElement | null>(null);
  $effect(() => {
    const target = element, key = id;
    if (!registry || !target) return;
    return registry.register(key, async focus => {
      if (!target.isConnected || !target.checkVisibility()) return false;
      revealSearchTarget(target, target.closest<HTMLElement>("[data-catalog-scroll]"), focus);
      return true;
    });
  });
</script>

{#if kind === "view"}
  <!-- The place content column (surface.css) frames a view unless the view hosts a catalog. -->
  <div bind:this={element} class:place-content={inset} data-content-layout={layout} data-view-content={id}
    hidden={visible === false || undefined}>{@render children?.()}</div>
{:else if kind === "item"}
  <svelte:element this={label ? "section" : "div"} bind:this={element} data-view-item={id} aria-label={label}
    hidden={visible === false || undefined}>{@render children?.()}</svelte:element>
{:else if kind === "document"}
  <article bind:this={element} class="place-content" data-place-content aria-label={label}
    hidden={visible === false || undefined}>{@render children?.()}</article>
{:else if kind === "retained"}
  <!-- Only a page of the workspace's main scroll takes the place inset (`inset`); a retained region inside it adds none. -->
  <div bind:this={element} class:place-retained={inset} data-retained-place hidden={visible === false || undefined}>{@render children?.()}</div>
{:else if visible === undefined}
  {@render children?.()}
{:else}
  <div hidden={!visible || undefined}>{@render children?.()}</div>
{/if}
