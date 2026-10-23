<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ResolvedNodeId } from '../../../../interaction/catalog.ts';
  import * as Field from '../../../vendor/components/ui/field/index.js';
  // The outer box measures available space; the complete accessible field
  // (including validation/support) owns its preferred measure inside it.
  const measures = { 'input.text': 'writing', 'input.multiline': 'writing',
    'control.select': 'choice', 'control.date': 'date', 'control.money': 'amount' } as const satisfies Partial<Record<ResolvedNodeId,string>>;
  let { kind, children, invalid, disabled }: {
    kind: keyof typeof measures; children?: Snippet; invalid?: boolean; disabled?: boolean;
  } = $props();
</script>

<div data-control-measure={measures[kind]}>
  <Field.Field data-primitive={kind.startsWith('input.') ? kind : undefined}
    data-control={kind.startsWith('control.') ? kind.slice(8) : undefined}
    data-invalid={invalid} data-disabled={disabled}>{@render children?.()}</Field.Field>
</div>
