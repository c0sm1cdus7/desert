<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		presentation = "default",
		...restProps
	}: DialogPrimitive.DescriptionProps & { presentation?: "default" | "message" } = $props();
</script>

<DialogPrimitive.Description
	bind:ref
	data-slot="dialog-description"
	class={cn(presentation === "message" ? "type-body text-foreground" : "text-muted-foreground text-sm",
		"*:[a]:hover:text-foreground *:[a]:underline *:[a]:underline-offset-3", className)}
	{...restProps}
/>
