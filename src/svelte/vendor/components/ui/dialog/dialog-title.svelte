<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		presentation = "default",
		...restProps
	}: DialogPrimitive.TitleProps & { presentation?: "default" | "message" | "picker" | "toolbar" } = $props();
</script>

<DialogPrimitive.Title
	bind:ref
	data-slot="dialog-title"
	data-toolbar-title={presentation === "toolbar" || undefined}
	class={cn(presentation === "default" ? "text-base leading-none font-medium" : "type-section", presentation === "toolbar" && "toolbar-title", className)}
	{...restProps}
/>
