<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { useSurfaceTypography } from "../../../infra/surface-typography.svelte.ts";
  import type { FrameInvocation } from "./frame-continuity.svelte.ts";
  import ModalPane from "./ModalPane.svelte";
  import ModalSheet from "./ModalSheet.svelte";
  import ModalDialog from "./ModalDialog.svelte";
  let { label, open, locked, presentation, continuity, ondismiss, onclosed, children }: CatalogProps<"modal"> = $props();
  const density = useSurfaceTypography();
  /** Escape, the scrim and the grip ask to dismiss; a locked modal refuses, and the caller decides what dismissal means. */
  const dismiss = () => { if (!locked) ondismiss?.(); };
  // A task pane stays open while its surface is hidden (a retained place); a sheet, message or media stage does not.
  dismissWhenInactive(() => { if (open && presentation !== "adaptive" && presentation !== "transient") dismiss(); });
  let pane = $state<ReturnType<typeof ModalPane>>();
  /** Called by the caller just before it invokes something: "close" before Back or Close, "other" otherwise. */
  export function noteInvocation(kind: FrameInvocation): void { pane?.noteInvocation(kind); }
</script>
{#if presentation === "adaptive" || presentation === "transient" || presentation === "navigation"}
  <ModalPane bind:this={pane} {label} {open} {locked} {presentation} {continuity} density={density()} {dismiss} {onclosed} {children} />
{:else if presentation === "sheet"}
  <ModalSheet {label} {open} {locked} density={density()} {dismiss} {onclosed} {children} />
{:else}
  <ModalDialog {label} {open} {presentation} density={density()} {dismiss} {onclosed} {children} />
{/if}
