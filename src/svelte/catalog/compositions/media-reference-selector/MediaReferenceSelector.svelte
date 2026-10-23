<script lang="ts">
  import * as Popover from '../../../vendor/components/ui/popover/index.js';
  import * as Field from '../../../vendor/components/ui/field/index.js';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Check from '@lucide/svelte/icons/check';
  import Image from '../../foundations/image/Image.svelte';
  import StackLayout from '../../foundations/stack-layout/StackLayout.svelte';
  import CollectionState from '../collection-state/CollectionState.svelte';
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  import type { ControlProps } from '../../../renderer-contracts.ts';
  let { node, onevent }: ControlProps<'labels'> = $props();
  let open = $state(false);
  let reference = $derived(node.mediaReference!);
  let selected = $derived(reference.options.find(option => node.values.includes(option.value)));
  dismissWhenInactive(() => open = false);
  function choose(value?: string) {
    if (node.disabled) return;
    onevent({ kind: 'labels.change', control: node.id, values: value ? [value] : [] });
    open = false;
  }
</script>

<div data-composition="media-reference-selector"><Field.FieldSet><Field.FieldLegend variant="label">{node.label}</Field.FieldLegend>
  <Popover.Root bind:open onOpenChange={next => { if (next) onevent({ kind: 'reference.refresh', control: node.id }); }}>
    <Popover.Trigger disabled={node.disabled} presentation="selection" aria-label={node.label}>
      {#if selected}<span data-media-reference-thumbnail><Image source={selected.source} alt="" /></span><span>Selected image</span>
      {:else}<span>{node.values.length ? 'Unavailable cover' : 'Automatic'}</span>{/if}<span data-control-chevron><ChevronDown aria-hidden="true" /></span>
    </Popover.Trigger>
    <Popover.Content presentation="reference"><StackLayout title={node.label}>
      {#if reference.loading}<Field.FieldDescription>Loading…</Field.FieldDescription>{/if}
      {#if reference.options.length}<div data-media-reference-options>
        {#each reference.options as option, index (option.value)}
          <Button variant="well" size="well" presentation="media-cover-choice" disabled={node.disabled} aria-label={`Cover image ${index + 1}`}
            aria-pressed={node.values.includes(option.value)} onclick={() => choose(option.value)}>
            <Image source={option.source} alt="" />
            {#if node.values.includes(option.value)}<span data-media-reference-selected><Check aria-hidden="true" /></span>{/if}
          </Button>
        {/each}
      </div>{:else if !reference.loading}<CollectionState loaded createLabel={undefined} />{/if}
      <Button variant="secondary" disabled={node.disabled} onclick={() => choose()}>Automatic cover</Button>
      {#if reference.error}<Field.FieldError>{reference.error}</Field.FieldError>{/if}
    </StackLayout></Popover.Content>
  </Popover.Root>
  {#if node.error}<Field.FieldError>{node.error}</Field.FieldError>{/if}
</Field.FieldSet></div>
<style>
  [data-media-reference-thumbnail]{width:44px;height:32px;flex:none;overflow:hidden;border-radius:6px;}
  [data-media-reference-options]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
  [data-media-reference-selected]{position:absolute;right:4px;bottom:4px;display:grid;place-items:center;background:var(--primary);color:var(--primary-foreground);border-radius:50%;width:24px;height:24px;}
</style>
