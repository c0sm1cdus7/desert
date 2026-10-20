<script lang="ts">
  import { Button } from "../vendor/components/ui/button/index.js";
  import type { drawerMotion } from "./drawer-motion.svelte.ts";
  let { motion, locked = false }: { motion: ReturnType<typeof drawerMotion>; locked?: boolean } = $props();
</script>

<svelte:window onblur={motion.cancel} />
<Button variant="grip" class="drawer-grip" data-drawer-grip aria-label="Close panel" disabled={locked}
  onclick={motion.click} onpointerdown={motion.down} onpointermove={motion.move}
  onpointerup={motion.up} onpointercancel={motion.cancel} onlostpointercapture={motion.lost}>
  <span data-drawer-grip-mark aria-hidden="true"></span>
</Button>
