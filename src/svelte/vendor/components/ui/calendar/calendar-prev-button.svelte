<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { Button, type ButtonVariant } from "@desert/svelte/vendor/components/ui/button/index.js";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = "ghost",
		"aria-label": label,
		...restProps
	}: CalendarPrimitive.PrevButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

<CalendarPrimitive.PrevButton bind:ref {...restProps}>
	{#snippet child({ props })}
		<Button {...props} {...(label ? { 'aria-label': label } : {})} {variant} class={cn("size-(--cell-size) p-0 select-none rtl:rotate-180", className)}>
			{#if children}{@render children()}{:else}<ChevronLeftIcon data-icon="inline-start" data-control-chevron />{/if}
		</Button>
	{/snippet}
</CalendarPrimitive.PrevButton>
