<script lang="ts">
  import type { Snippet } from "svelte";
  import { Icon } from "../../index.ts";
  import { newAvatarSeed } from "../../../infra/avatar-seed.ts";
  import { pressFeedbackProps } from "../../mechanisms/press-feedback/press-feedback.ts";
  // The avatar as a button that draws a new seed; the overlay shows on hover or focus, and always on touch screens.
  let { size, label, disabled, onshuffle, children }: { size: "portrait" | "compact" | "row"; label: string | undefined; disabled: boolean;
    onshuffle: ((seed: string) => void) | undefined; children: Snippet } = $props();
  // The button is exactly the avatar's box; the pane's border overlaps the drawing, as AvatarShuffle's button did.
  const sizes = { portrait: "size-[5.625rem]", compact: "size-11", row: "size-10" } as const;
</script>
<button type="button" {...pressFeedbackProps} class="shuffle material-pane control-feedback inline-flex shrink-0 items-center justify-center whitespace-nowrap gap-2
  rounded-full type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-secondary-foreground p-0 relative
  overflow-hidden {sizes[size]}" aria-label={label} {disabled} onclick={() => onshuffle?.(newAvatarSeed())}>
  <span class="content control-feedback-content disabled-content">{@render children()}<span class="overlay" data-avatar-shuffle><Icon name="shuffle" decorative /></span></span>
</button>
<style>
  .content { position:relative; display:flex; width:100%; min-width:0; }
  .overlay { position:absolute; inset:0; display:grid; place-items:center; background:var(--avatar-shuffle-overlay); color:white; opacity:0; }
  .shuffle:is(:hover,:focus) .overlay { opacity:1; }
  @media (hover:none) { .overlay { inset:auto 0 0 auto; width:2rem; height:2rem; border-radius:var(--radius-mark); opacity:1; } }
</style>
