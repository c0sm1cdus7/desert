<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button, type ButtonVariant } from "@desert/svelte/vendor/components/ui/button/index.js";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = "ghost",
		"aria-label": label,
		...restProps
	}: CalendarPrimitive.NextButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

<CalendarPrimitive.NextButton bind:ref {...restProps}>
	{#snippet child({ props })}
		<Button {...props} {...(label ? { 'aria-label': label } : {})} {variant} class={cn("size-(--cell-size) p-0 select-none rtl:rotate-180", className)}>
			{#if children}{@render children()}{:else}<ChevronRightIcon data-icon="inline-end" data-control-chevron />{/if}
		</Button>
	{/snippet}
</CalendarPrimitive.NextButton>
