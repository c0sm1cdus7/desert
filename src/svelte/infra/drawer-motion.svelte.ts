import { untrack } from "svelte";
import { swipeMotion } from "./swipe-motion.svelte.ts";

export function drawerMotion(close: () => void, locked: () => boolean, edge: () => "bottom" | "right") {
  const motion = swipeMotion({ edge, enabled: () => !locked(), commit: close });
  $effect(() => { edge(); untrack(motion.reset); });
  return {
    get edge() { return edge(); },
    get progress() { return motion.progress; },
    get dragging() { return motion.dragging; },
    get overlayStyle() { return `--surface-scrim-opacity:${1 - motion.progress * .6}`; },
    get transform() { return motion.transform; },
    down(event: PointerEvent) {
      if (locked()) return;
      const target = event.currentTarget as HTMLElement;
      target.closest(".drawer")?.getAnimations().forEach(animation => animation.finish());
      motion.down(event);
    },
    move: motion.move, up: motion.up, click: motion.click, cancel: motion.cancel, lost: motion.lost, reset: motion.reset,
  };
}
