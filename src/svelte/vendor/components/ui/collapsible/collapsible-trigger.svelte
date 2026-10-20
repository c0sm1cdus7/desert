<script lang="ts">
  import { Collapsible as Primitive } from "bits-ui";
  let { ref = $bindable(null), ...rest }: Primitive.TriggerProps = $props();
</script>
<Primitive.Trigger bind:ref data-slot="collapsible-trigger" {...rest} />
