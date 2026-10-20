<script lang="ts">
  import { Collapsible as Primitive } from "bits-ui";
  let { ref = $bindable(null), ...rest }: Primitive.ContentProps = $props();
</script>
<Primitive.Content bind:ref data-slot="collapsible-content" {...rest} />
