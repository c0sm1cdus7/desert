<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		presentation = "default",
		...restProps
	}: DialogPrimitive.TitleProps & { presentation?: "default" | "message" | "picker" } = $props();
</script>

<DialogPrimitive.Title
	bind:ref
	data-slot="dialog-title"
	class={cn(presentation === "default" ? "text-base leading-none font-medium" : "type-title", className)}
	{...restProps}
/>
