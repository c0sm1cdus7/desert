<script lang="ts">
  import { untrack } from "svelte";
  import { Wallpaper } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { provideToolbarScroll } from "../../mechanisms/toolbar-scroll/toolbar-scroll.svelte.ts";
  import { provideSurfaceHost } from "../../mechanisms/surface-host/surface-host.svelte.ts";
  import ScrollEdges from "./ScrollEdges.svelte";
  import { observePlaceFocus } from "./place-focus.ts";
  let { kind, label, destination, searching, presentation = "standard", backdrop, form, oncomposition, onsubmit,
    top, content, bottom, overlay }: CatalogProps<"surface"> = $props();
  let owner = $state<HTMLElement | null>(null), viewport = $state<HTMLElement | null>(null);
  // A frame is the host its portalled transients size against; every scroll owner gives its top bar "back to top".
  if (untrack(() => kind) === "frame") provideSurfaceHost(() => owner);
  provideToolbarScroll({ owner: () => owner, viewport: () => viewport });
  $effect(() => {
    if (viewport && owner && (kind === "main" || kind === "navigation")) return observePlaceFocus(viewport, owner);
  });
  export function scrollToTop(): void { viewport?.scrollTo({ top: 0 }); }
  export function scrollTop(): number { return viewport?.scrollTop ?? 0; }
  export function scrollTo(top: number): void { viewport?.scrollTo({ top }); }
  function submit(event: SubmitEvent) { event.preventDefault(); onsubmit?.(); }
  let main = $derived(kind === "main");
</script>

{#snippet frameSlots()}
  {@render top?.()}
  <div bind:this={viewport} class="surface-content min-h-0 flex-1 overflow-auto" data-surface-slot="content">{@render content?.()}</div>
  {@render bottom?.()}
  <ScrollEdges {viewport} {owner} />
{/snippet}

{#if kind === "frame"}
  <section bind:this={owner} class="flex min-h-0 min-w-0 flex-1 flex-col" data-scroll-owner data-surface-host data-surface-frame
    data-frame-presentation={presentation} tabindex="-1" aria-label={label}>
    {#if form}<form id={form.id} class="flex min-h-0 flex-1 flex-col" novalidate aria-label={form.label} onsubmit={submit}>{@render frameSlots()}</form>
    {:else}{@render frameSlots()}{/if}
  </section>
{:else if kind === "page"}
  <div data-surface="page">
    {#if backdrop}<div data-surface-backdrop><Wallpaper wallpaper={backdrop} /></div>{/if}
    <header data-surface-page-top>{@render top?.()}</header>
    <main data-surface-page-content aria-label={label}>{@render content?.()}</main>
  </div>
{:else}
  <!-- Programmatic restoration targets only: this expression is -1 or absent, never a tab stop. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div bind:this={owner} class="place-frame" data-place="true" data-scroll-owner="true"
    data-renderer-profile={kind === "navigation" ? "apple-reference" : undefined}
    data-catalog-navigation={kind === "navigation" ? "true" : undefined}
    data-catalog-content={main ? "true" : undefined}
    data-destination={destination} role={kind}
    tabindex={main ? -1 : undefined} aria-label={label}
    oncompositionstart={() => oncomposition?.(true)} oncompositionend={() => oncomposition?.(false)}>
    {@render top?.()}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Only -1 or absent; no keyboard tab stop.) -->
    <div bind:this={viewport} class="place-viewport" data-catalog-scroll={main ? "" : undefined} tabindex={main ? -1 : undefined}
      inert={main ? searching : undefined} aria-hidden={main && searching ? "true" : undefined}>
      {@render content?.()}
    </div>
    {@render bottom?.()}
    {#if main}{@render overlay?.()}{/if}
    <ScrollEdges {viewport} {owner} />
  </div>
{/if}
