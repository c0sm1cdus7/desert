<script lang="ts">
  // Test probe: records on window when the surface activity it inherits dismisses it.
  import { dismissWhenInactive } from "../../src/svelte/infra/surface-activity.svelte.ts";
  dismissWhenInactive(() => Reflect.set(window, "dismissed", true));
</script>
<p>Draft</p>
