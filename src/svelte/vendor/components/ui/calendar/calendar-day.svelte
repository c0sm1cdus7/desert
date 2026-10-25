<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";
	import { pressFeedbackProps } from "@desert/svelte/catalog/mechanisms/press-feedback/press-feedback.ts";
	import { calendarControl, dayFaces } from "./calendar-control.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		child: customChild,
		...restProps
	}: CalendarPrimitive.DayProps = $props();
	let dayClasses = $derived(cn(
		"size-(--cell-size) w-(--cell-size) flex-col items-center justify-center gap-1 rounded-(--cell-radius) border-0 p-0 leading-none font-normal whitespace-nowrap select-none",
		"[&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
		"[&[data-today]:not([data-selected])]:text-accent-foreground [&[data-today][data-disabled]]:text-muted-foreground",
		// Outside months
		"[&[data-outside-month]:not([data-selected])]:text-muted-foreground",
		// Disabled
		"data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
		// Unavailable
		"data-[unavailable]:text-muted-foreground data-[unavailable]:line-through",
		// focus
		"focus:relative focus:border-ring focus:ring-ring/50 focus-visible:-outline-offset-2",
		// Preserve author-supplied day detail spans inside the shared content layer.
		"[&>[data-button-content]>span]:text-xs [&>[data-button-content]>span]:opacity-70",
		className
	));
</script>

<CalendarPrimitive.Day bind:ref class={dayClasses} {...restProps}>
	{#snippet child({ props, day, selected, disabled, unavailable })}
		{#if customChild}
			{@render customChild({ props, day, selected, disabled, unavailable })}
		{:else}
		{@const kind = selected ? "selected" : props['data-today'] !== undefined ? "today" : "day"}
		{@const face = dayFaces[kind]}
		<button {...pressFeedbackProps} {...props} type="button" {disabled} data-slot="calendar-day" data-day-face={kind}
			class={cn(calendarControl, face.material, face.ink, dayClasses)}>
			<span class="control-feedback-content" data-button-content>{#if children}{@render children({ day, selected, disabled, unavailable })}{:else}{day}{/if}</span>
		</button>
		{/if}
	{/snippet}
</CalendarPrimitive.Day>
