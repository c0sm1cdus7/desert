// The vendor popover content applies no focus policy of its own (design §5: its owner, the popover foundation, passes
// it). Tests of the surface-focus mechanism on raw Bits popovers wire that policy here, exactly as the owner does, by
// overriding the vendor file in the in-memory build.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const vendor = resolve(import.meta.dirname, "../../src/svelte/vendor/components/ui/popover/popover-content.svelte");

export async function scopedPopoverContent(): Promise<Record<string, string>> {
  const source = await readFile(vendor, "utf8");
  const scoped = source
    .replace(`  import { cn } from "../../../utils.js";`, `  import { cn } from "../../../utils.js";
  import { surfaceFocus } from "@desert/svelte/catalog/mechanisms/surface-focus/surface-focus.svelte.ts";`)
    .replace(`let { ref = $bindable(null), class: className, presentation = "pane", density, ...props }`,
      `let { ref = $bindable(null), class: className, presentation = "pane", density, onOpenAutoFocus, onCloseAutoFocus, onFocusOutside, ...props }`)
    .replace(`  } = $props();`, `  } = $props();
  const focus = surfaceFocus(() => ref, event => onFocusOutside?.(event));`)
    .replace(`{...props} role=`, `onOpenAutoFocus={event => focus.open(event, onOpenAutoFocus)}
    onCloseAutoFocus={event => focus.close(event, onCloseAutoFocus)} {...props} role=`);
  if (!scoped.includes("focus.open(") || !scoped.includes("const focus")) throw new Error("SCOPED_POPOVER_FIXTURE_STALE");
  return { [vendor]: scoped };
}
