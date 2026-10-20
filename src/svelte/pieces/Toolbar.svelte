<script lang="ts">
  import type { Toolbar } from "../../interaction/toolbar.ts";
  import { intentKey, submitsJourney, type SurfaceIntent } from "../../interaction/intent.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import AnchoredSurface from "./AnchoredSurface.svelte";
  import ToolbarLayout from "./ToolbarLayout.svelte";
  import { cn } from "../vendor/utils.js";
  import { Title } from "../vendor/components/ui/dialog/index.js";
  import type { Snippet } from "svelte";
let { toolbar, invoke, submit, presentation = "standard", controls }: { toolbar: Toolbar;
    controls?: Snippet;
    invoke: (intent: SurfaceIntent) => void; submit?: string | undefined; presentation?: "standard" | "message" | "transient" } = $props();
  let row = $state<HTMLDivElement | null>(null), leading = $state<HTMLDivElement | null>(null);
  let utilities = $state<HTMLDivElement | null>(null);
  let customControls = $state<HTMLDivElement | null>(null);
  let capacity = $state(1), open = $state(false), heldCount = $state<number | null>(null), stacked = $state(false);
  let trailing = $derived(toolbar.edge === "top" ? toolbar.trailing ?? [] : []);
  let visibleCount = $derived(heldCount ?? (trailing.length <= capacity ? trailing.length : Math.max(0, capacity - 1)));
  let overflow = $derived(trailing.slice(visibleCount));
  const event = (value: BankEvent) => { if (value.kind === "surface.invoke") invoke(value.intent); };
  function change(next: boolean) { heldCount = next ? visibleCount : null; open = next; }
  $effect(() => {
    trailing.length;
    if (!row) return;
    const container = row, rail = utilities, navigationRail = leading, controlRail = customControls;
    const measure = () => {
      const navigation = navigationRail?.getBoundingClientRect().width ?? 0;
      const slot = rail?.firstElementChild?.getBoundingClientRect().width ?? (navigation || 44);
      const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
      const railGap = rail ? parseFloat(getComputedStyle(rail).columnGap) || 0 : 0;
      const titleSize = parseFloat(getComputedStyle(container.querySelector('h2, [role="heading"]') ?? container).fontSize);
      // Heading and utilities share the remaining rail; surplus utilities stay reachable in one typed surface.
      const remaining = container.clientWidth - navigation - gap * (navigation ? 2 : 1);
      stacked = controlRail
        ? remaining - controlRail.getBoundingClientRect().width - gap < titleSize * 4
        : trailing.length > 0 && remaining < Math.max(slot * 2, titleSize * 10);
      const budget = Math.max(slot, stacked ? container.clientWidth - navigation - gap : remaining / 2);
      capacity = Math.max(1, Math.floor((budget + railGap) / (slot + railGap)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (rail) observer.observe(rail);
    if (navigationRail) observer.observe(navigationRail);
    if (controlRail) observer.observe(controlRail);
    measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
</script>
{#if toolbar.edge === "top"}
  <ToolbarLayout class="workspace-header" data-surface-slot="top" face={toolbar.face} bind:row {stacked}>
    {#snippet children()}
      {#if toolbar.leading && presentation !== "message"}
        <div bind:this={leading} class="toolbar-action" data-toolbar-navigation>
          <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action: toolbar.leading, role: "secondary" }} onevent={event} />
        </div>
      {/if}
      <div class={cn("toolbar-heading flex min-w-0 flex-1 items-center gap-3", stacked && "order-last basis-full")}>
        <div class="min-w-0 flex-1">
          {#if presentation === "message"}<Title presentation="message" class="toolbar-title">{toolbar.title}</Title>
          {:else}<h2 class="toolbar-title type-title" title={toolbar.title}>{toolbar.title}</h2>{/if}
          {#if toolbar.subtitle}<p class="toolbar-subtitle type-support" title={toolbar.subtitle}>{toolbar.subtitle}</p>{/if}
        </div>
      </div>
      {#if controls}<div bind:this={customControls} class="ml-auto flex shrink-0 items-center gap-2" data-toolbar-controls>{@render controls()}</div>{/if}
      {#if trailing.length}
        <div bind:this={utilities} class="ml-auto flex min-w-0 shrink-0 gap-3" data-toolbar-utilities>
          {#each trailing.slice(0, visibleCount) as action (intentKey(action.intent))}
            <div class="toolbar-action">
              <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action, role: "secondary" }} onevent={event} />
            </div>
          {/each}
          {#if overflow.length}
            <div class="toolbar-action" data-toolbar-overflow>
              <AnchoredSurface label="More actions" title="More actions" content={{kind:"utilities",actions:overflow}}
                icon="more" {open} onchange={change}
                invoke={intent => { change(false); invoke(intent); }} />
            </div>
          {/if}
        </div>
      {/if}
    {/snippet}
    {#snippet support()}
      {#if toolbar.availability}<div class="toolbar-availability" title={toolbar.availability.label}>
        <BankRenderer node={{ version: "desert.bank-node/1", kind: "availability", ...toolbar.availability }} />
      </div>{/if}
    {/snippet}
  </ToolbarLayout>
{:else}
  <ToolbarLayout edge="bottom" class="bank-footer drawer-dismiss shrink-0" data-surface-slot="bottom">
    {#if toolbar.secondary}
      <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action: toolbar.secondary, role: "secondary" }} onevent={event} />
    {/if}
    {#if toolbar.primary}
      <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action: toolbar.primary, role: "primary",
        form: submitsJourney(toolbar.primary.intent, submit) }} onevent={event} />
    {/if}
  </ToolbarLayout>
{/if}
