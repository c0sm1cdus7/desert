<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	/** The public buttonVariants contract. */
	export const buttonVariants = tv({
        base: "tm-control inline-flex shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-full type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants: {
            spin: { true: "[&_svg[data-icon]]:animate-spin" },
            variant: {
                default: "text-primary-text font-semibold",
                outline: "text-foreground",
                secondary: "text-secondary-foreground",
                ghost: "bg-transparent text-foreground",
                grip: "bg-transparent text-muted-foreground rounded-lg",
                destructive: "text-destructive",
                link: "bg-transparent text-primary-text underline-offset-4 hover:underline",
                row: "bg-transparent text-foreground border-0 rounded-none justify-start whitespace-normal h-auto text-left font-normal w-full",
                field: "bg-transparent text-foreground border-0 rounded-none justify-start w-full font-normal",
                well: "text-foreground rounded-[var(--radius)] justify-start text-left whitespace-normal w-full font-normal",
            },
            size: {
                default: "min-h-11 px-4 py-2", xs: "min-h-6 px-2", sm: "min-h-9 px-3",
                lg: "min-h-11 px-5", icon: "size-10", "icon-xs": "size-6", "icon-sm": "size-9", "icon-lg": "size-11",
                row: "px-4 py-3", field: "min-h-10 px-3", well: "p-0",
            },
        },
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	/** The public ButtonVariant contract. */
	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	/** The public ButtonSize contract. */
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	/** The public ButtonProps contract. */
	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			/** Rotate marked icons only; busy/disabled semantics remain the caller's responsibility. */
			spin?: boolean;
		};
</script>

<script lang="ts">
	import { pressFeedbackProps } from "./press-feedback.js";
	let {
		class: className,
		variant = "default",
		size = "default",
		spin = false,
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-material={['ghost','grip','link','row','field'].includes(variant) ? 'interior' : 'pane'}
		class={cn(buttonVariants({ variant, size, spin }), "tm-control", className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		<span data-button-content>{@render children?.()}</span>
	</a>
{:else}
	<button
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-material={['ghost','grip','link','row','field'].includes(variant) ? 'interior' : 'pane'}
		class={cn(buttonVariants({ variant, size, spin }), "tm-control", className)}
		{type}
		{disabled}
		{...restProps}
	>
		<span data-button-content>{@render children?.()}</span>
	</button>
{/if}
