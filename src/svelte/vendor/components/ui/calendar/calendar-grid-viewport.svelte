<script lang="ts">
	import type { Snippet } from "svelte";
	import { revealSurfaceFocus } from "@desert/svelte/infra/surface-focus.svelte.ts";
	let { children }: { children: Snippet } = $props();

	function revealFocus(event: FocusEvent & { currentTarget: HTMLDivElement }) {
		const viewport = event.currentTarget, target = event.target;
		if (!(target instanceof HTMLElement)) return;
		// Keep keyboard navigation local to the two-dimensional day grid. The
		// month caption and navigation are outside this scrolling viewport.
		queueMicrotask(() => {
			if (!viewport.isConnected || document.activeElement !== target) return;
			revealSurfaceFocus(target, viewport);
		});
	}
</script>

<div data-calendar-grid-viewport class="min-h-0 min-w-0 max-w-full overflow-auto" onfocusin={revealFocus}>
	{@render children()}
</div>
