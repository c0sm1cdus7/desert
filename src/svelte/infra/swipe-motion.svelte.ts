// F1-merge: the catalog-navigation composition (lane F) still imports this path; shell and modal list the swipe-motion
// mechanism and import it directly. When lane F mounts Shell and deletes that composition, this re-export goes.
export { swipeMotion } from "../catalog/mechanisms/swipe-motion/swipe-motion.svelte.ts";
