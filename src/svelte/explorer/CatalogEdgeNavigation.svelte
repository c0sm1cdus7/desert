<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import { useSidebar } from "../vendor/components/ui/sidebar/index.js";
  import { swipeMotion } from "../pieces/swipe-motion.svelte.js";
  let { searching, detail, onback, viewport }: {
    searching: boolean; detail: boolean; onback?: () => void; viewport: HTMLElement | null;
  } = $props();
  const sidebar = useSidebar();
  let settling = $state(false);
  let animation: Animation | undefined;
  let back = false, accepted = false;
  const motion = swipeMotion({ edge: () => "right", enabled: () => !settling && !searching,
    threshold: () => Math.min(120, (viewport?.clientWidth ?? 0) * .25), commit: () => { accepted = true; void finish(true); } });
  const panel = () => document.getElementById(sidebar.panelId);
  let available = $derived(Boolean(viewport) && !sidebar.expanded && !searching);
  // A changed layout or destination invalidates the gesture's starting geometry.
  $effect(() => { sidebar.presentation; searching; detail; untrack(() => { if (motion.tracking) cancel(); }); });

  function down(event: PointerEvent) {
    if (!available || settling || document.querySelector('[role="dialog"][data-state="open"]')) return;
    back = detail && Boolean(onback); accepted = false; motion.reset(); motion.down(event);
  }
  function move(event: PointerEvent) {
    motion.move(event);
    if (!motion.dragging) return;
    if (back && viewport) viewport.style.transform = `translateX(${motion.offset}px)`;
    else sidebar.revealOffset = motion.offset;
  }
  async function finish(commit: boolean) {
    if (settling) return;
    const element = back ? viewport : panel();
    if (!element || (!back && !sidebar.revealing)) { motion.reset(); return; }
    settling = true;
    const destination = back ? (commit ? `translateX(${element.clientWidth}px)` : "translateX(0)")
      : sidebar.presentation === "overlay" ? (commit ? "translateX(0)" : "translateX(calc(-100% - var(--surface-inset)))")
      : `translateX(${commit ? element.getBoundingClientRect().width : 0}px)`;
    animation = element.animate([{ transform: getComputedStyle(element).transform }, { transform: destination }], {
      duration: prefersReducedMotion.current ? 0 : 220, easing: "cubic-bezier(.2,0,0,1)", fill: "forwards",
    });
    try { await animation.finished; } catch { return; }
    if (commit) {
      if (back) onback?.();
      else {
        sidebar.revealedByGesture = true;
        if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(true); else sidebar.setOpen(true);
      }
    }
    if (back && viewport) viewport.style.removeProperty("transform");
    sidebar.revealOffset = null; animation.cancel(); animation = undefined;
    motion.reset(); settling = false;
  }
  function up(event: PointerEvent) { motion.up(event); if (!accepted) void finish(false); }
  function cancel() { if (!motion.tracking && !sidebar.revealing) return; motion.cancel(); void finish(false); }
  function lost(event: PointerEvent) { if (motion.tracking) { motion.lost(event); void finish(false); } }
  onDestroy(() => { animation?.cancel(); motion.reset(); sidebar.revealOffset = null; viewport?.style.removeProperty("transform"); });
</script>

<svelte:window onblur={cancel} onkeydown={event => { if (event.key === "Escape" && motion.tracking) { event.preventDefault(); cancel(); } }} />

{#if available}
  <!-- A pointer-only shortcut; the visible Back/Sidebar buttons own keyboard semantics. -->
  <div data-catalog-edge-navigation aria-hidden="true" role="presentation"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={cancel} onlostpointercapture={lost}></div>
{/if}
