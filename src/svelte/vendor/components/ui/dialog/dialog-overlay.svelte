<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		presentation = "default",
		...restProps
	}: DialogPrimitive.OverlayProps & { presentation?: "default" | "panel" | "message" | "media" } = $props();
</script>

<DialogPrimitive.Overlay
	bind:ref
	data-slot="dialog-overlay"
	class={cn(presentation === 'media' && 'media-viewer-scrim', presentation === "default"
    ? "scrim bg-black/10 isolate z-50"
    : presentation === "panel" || presentation === "media" ? "scrim" : "scrim problem-scrim", className)}
	{...restProps}
/>
