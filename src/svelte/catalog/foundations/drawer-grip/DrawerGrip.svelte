<script lang="ts">
  // F1-merge: absorbed by modal (its DrawerGrip part); this unmounted declaration stays only until Batch 3 deletes the
  // folder with its ledger entry (design §0 P2, P3).
  import { Button } from "../../../vendor/components/ui/button/index.js";
  type GripMotion = { click: () => void; down: (event: PointerEvent) => void; move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void; cancel: () => void; lost: (event: PointerEvent) => void };
  let { motion, locked = false }: { motion: GripMotion; locked?: boolean } = $props();
</script>

<svelte:window onblur={motion.cancel} />
<Button variant="grip" class="drawer-grip" data-drawer-grip aria-label="Close panel" disabled={locked}
  onclick={motion.click} onpointerdown={motion.down} onpointermove={motion.move}
  onpointerup={motion.up} onpointercancel={motion.cancel} onlostpointercapture={motion.lost}>
  <span data-drawer-grip-mark aria-hidden="true"></span>
</Button>
