<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // The grip of a bottom-edge modal: pressing it, or dragging it past the threshold, dismisses the modal. A native
  // button the modal draws (design §1.3: the vendor `grip` variant's pixels move here).
  import type { drawerMotion } from "./drawer-motion.svelte.ts";
  // F1-merge: press feedback — the button family's pressFeedback attachment until its owner is settled (as Tag, Avatar).
  import { pressFeedbackProps } from "../../../vendor/components/ui/button/press-feedback.js";
  let { motion, locked }: { motion: ReturnType<typeof drawerMotion>; locked: boolean } = $props();
</script>

<svelte:window onblur={motion.cancel} />
<button {...pressFeedbackProps} type="button" data-drawer-grip aria-label={say(m.modal.close)} disabled={locked}
  class="control-focus material-interior drawer-grip inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-transparent px-4 py-2 type-control text-muted-foreground outline-none disabled:pointer-events-none"
  onclick={motion.click} onpointerdown={motion.down} onpointermove={motion.move}
  onpointerup={motion.up} onpointercancel={motion.cancel} onlostpointercapture={motion.lost}>
  <span class="control-feedback-content" data-button-content><span data-drawer-grip-mark aria-hidden="true"></span></span>
</button>
