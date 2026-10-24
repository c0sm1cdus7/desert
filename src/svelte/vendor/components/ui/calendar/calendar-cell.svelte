<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.CellProps = $props();
</script>

<CalendarPrimitive.Cell
	bind:ref
	data-slot="calendar-cell"
	class={cn(
		"relative w-(--cell-size) h-[max(var(--cell-size),2.75rem)] p-0 text-center text-sm focus-within:z-20 [&:first-child[data-selected]_[data-bits-day]]:rounded-s-(--cell-radius) [&:last-child[data-selected]_[data-bits-day]]:rounded-e-(--cell-radius)",
		className
	)}
	{...restProps}
/>
