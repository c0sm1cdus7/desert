<script lang="ts">
  import type { CatalogProps } from '../../types.d.ts';
  import * as Field from '../../../vendor/components/ui/field/index.js';
  // The outer box measures available space; the complete accessible field
  // (including validation/support) owns its preferred measure inside it.
  const measures = { 'input.text': 'writing', 'input.multiline': 'writing',
    'control.select': 'choice', 'control.date': 'date', 'control.money': 'amount' } as const satisfies Record<CatalogProps<'measured-field'>['kind'],string>;
  let { kind, children, invalid, disabled }: CatalogProps<'measured-field'> = $props();
</script>

<div data-control-measure={measures[kind]}>
  <Field.Field data-primitive={kind.startsWith('input.') ? kind : undefined}
    data-control={kind.startsWith('control.') ? kind.slice(8) : undefined}
    data-invalid={invalid} data-disabled={disabled}>{@render children?.()}</Field.Field>
</div>
