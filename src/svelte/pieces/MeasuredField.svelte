<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import * as Field from '../vendor/components/ui/field/index.js';
  // The outer box measures available space; the complete accessible field
  // (including validation/support) owns its preferred measure inside it.
  let { measure, children, ...attributes }: ComponentProps<typeof Field.Field> & {
    measure: 'writing' | 'choice' | 'date' | 'amount';
  } = $props();
</script>

<div data-control-measure={measure}>
  <Field.Field {...attributes}>{@render children?.()}</Field.Field>
</div>
