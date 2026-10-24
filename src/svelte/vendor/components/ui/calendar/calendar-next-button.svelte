<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { cn } from "@desert/svelte/vendor/utils.js";
	// F1-merge: press feedback — the button family's pressFeedback attachment until its owner is settled (as Tag, Avatar).
	import { pressFeedbackProps } from "@desert/svelte/vendor/components/ui/button/press-feedback.js";
	import { calendarControl } from "./calendar-control.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		"aria-label": label,
		...restProps
	}: CalendarPrimitive.NextButtonProps = $props();
</script>

<CalendarPrimitive.NextButton bind:ref {...restProps}>
	{#snippet child({ props })}
		<button {...pressFeedbackProps} {...props} {...(label ? { 'aria-label': label } : {})} type="button" data-slot="calendar-next-button"
			class={cn(calendarControl, "material-pane size-(--cell-size) rounded-[var(--radius)] p-0 text-secondary-foreground select-none rtl:rotate-180", className)}>
			<span class="control-feedback-content" data-button-content>{#if children}{@render children()}{:else}<ChevronRightIcon data-icon="inline-end" data-control-chevron />{/if}</span>
		</button>
	{/snippet}
</CalendarPrimitive.NextButton>
