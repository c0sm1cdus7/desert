// F1-merge: infra/drawer-motion.svelte.ts (becoming a modal part, F1d) and the catalog-navigation composition (lane F)
// still import this path. Modal lists the swipe-motion mechanism and imports it directly; then this re-export goes.
export { swipeMotion } from "../catalog/mechanisms/swipe-motion/swipe-motion.svelte.ts";
