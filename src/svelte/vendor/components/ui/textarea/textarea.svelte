<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from "@desert/svelte/vendor/utils.js";
	import type { HTMLTextareaAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		"data-slot": dataSlot = "textarea",
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	data-material={dataSlot === "input-group-control" ? "interior" : "pane"}
	class={cn(
		"rounded-lg px-2.5 py-2 text-base transition-colors md:text-sm flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
		"tm-control", className
	)}
	bind:value
	{...restProps}></textarea>
