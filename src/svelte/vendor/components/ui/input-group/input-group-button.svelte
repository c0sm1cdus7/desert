<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	const inputGroupButtonVariants = tv({
		base: "gap-2 text-sm flex items-center shadow-none",
		variants: {
			size: {
				xs: "h-6 gap-1 px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
				sm: "",
				"icon-xs": "size-6 p-0 has-[>svg]:p-0",
				"icon-sm": "size-8 p-0 has-[>svg]:p-0",
			},
		},
		defaultVariants: {
			size: "xs",
		},
	});

	/** The public InputGroupButtonSize contract. */
	export type InputGroupButtonSize = VariantProps<typeof inputGroupButtonVariants>["size"];
</script>

<script lang="ts">
	import { pressFeedbackProps } from "@desert/svelte/catalog/mechanisms/press-feedback/press-feedback.ts";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	// A native button this family draws itself: the button family's ghost recipe at its default size, resolved, under
	// the group's own sizes (so the field family owns no cross-family import).
	const ghost = "inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-[var(--radius)] type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent text-foreground min-h-11 px-4 py-2";

	let {
		ref = $bindable(null),
		class: className,
		children,
		type = "button",
		size = "xs",
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		size?: InputGroupButtonSize;
	} = $props();
	let groupClass = $derived(cn(inputGroupButtonVariants({ size }), className));
	let material = $derived(/\bmaterial-(?:pane|interior)\b/.test(groupClass) ? undefined : "material-interior");
</script>

<button
	{...pressFeedbackProps}
	bind:this={ref}
	data-slot="input-group-button"
	class={cn(ghost, material, "control-feedback", groupClass)}
	{type}
	data-size={size}
	{...restProps}
	data-variant="ghost"
>
	<span class="control-feedback-content" data-button-content>{@render children?.()}</span>
</button>
