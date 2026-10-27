<script lang="ts">
	// The owner (date-control) passes how a focused day is revealed inside this scrolling viewport.
	import type { Snippet } from "svelte";
	let { children, revealFocus }: { children: Snippet; revealFocus?: ((target: HTMLElement, viewport: HTMLElement) => void) | undefined } = $props();

	function reveal(event: FocusEvent & { currentTarget: HTMLDivElement }) {
		const viewport = event.currentTarget, target = event.target;
		if (!revealFocus || !(target instanceof HTMLElement)) return;
		const show = revealFocus;
		// Keep keyboard navigation local to the two-dimensional day grid. The
		// month caption and navigation are outside this scrolling viewport.
		queueMicrotask(() => {
			if (!viewport.isConnected || document.activeElement !== target) return;
			show(target, viewport);
		});
	}
</script>

<div data-calendar-grid-viewport class="min-h-0 min-w-0 max-w-full overflow-auto" onfocusin={reveal}>
	{@render children()}
</div>
