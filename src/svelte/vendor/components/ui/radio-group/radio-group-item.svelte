<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from "bits-ui";
	import RadioMark, { radioMarkClasses } from './radio-mark.svelte';
	import { cn, type WithoutChildrenOrChild } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		presentation = "standard",
		...restProps
	}: WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> & { presentation?: "standard" | "swatch" } = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(
		radioMarkClasses,
		"focus-visible:ring-ring/50 focus-visible:ring-3 aria-invalid:ring-destructive/20 aria-invalid:ring-3 aria-invalid:border-destructive group-has-[:focus-visible]/field-label:ring-0 group/radio-group-item peer aspect-square outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
		presentation === "swatch" && "size-full border-0 bg-transparent dark:bg-transparent data-[state=checked]:bg-transparent text-white [&>svg]:size-[1.125rem]!",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<RadioMark {checked} embedded />
	{/snippet}
</RadioGroupPrimitive.Item>
