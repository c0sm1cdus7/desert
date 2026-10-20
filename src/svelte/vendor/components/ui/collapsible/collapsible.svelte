<script lang="ts">
  import { Collapsible as Primitive } from "bits-ui";
  let { ref = $bindable(null), open = $bindable(false), ...rest }: Primitive.RootProps = $props();
</script>
<Primitive.Root bind:ref bind:open data-slot="collapsible" {...rest} />
