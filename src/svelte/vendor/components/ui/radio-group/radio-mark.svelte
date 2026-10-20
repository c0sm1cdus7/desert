<script lang="ts" module>
  export const radioMarkClasses = "relative flex size-4 shrink-0 items-center justify-center rounded-full border border-choice-outline dark:bg-input/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary";
</script>
<script lang="ts">
  import CircleIcon from '@lucide/svelte/icons/circle';
  let { checked, embedded = false }: { checked: boolean; embedded?: boolean } = $props();
</script>

<!-- A visual mark only. The owning radio or listbox option supplies semantics. -->
{#snippet dot()}
  {#if checked}<CircleIcon aria-hidden="true" class="absolute size-2! rounded-full bg-primary-foreground text-primary-foreground" />{/if}
{/snippet}
{#if embedded}
  {@render dot()}
{:else}
  <span aria-hidden="true" data-selection-mark="single" data-state={checked ? 'checked' : 'unchecked'} class={radioMarkClasses}>
    {@render dot()}
  </span>
{/if}
