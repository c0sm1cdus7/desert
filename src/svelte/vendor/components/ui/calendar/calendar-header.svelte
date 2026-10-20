<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.HeaderProps = $props();
</script>

<CalendarPrimitive.Header
	bind:ref
	class={cn(
		"flex min-h-(--cell-size) w-full flex-wrap items-center justify-center gap-1.5 px-(--cell-size) text-center text-sm font-medium @max-[12rem]/calendar:px-0 @max-[12rem]/calendar:pt-[calc(var(--cell-size)+0.5rem)]",
		className
	)}
	{...restProps}
/>
