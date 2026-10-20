<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	/** The public badgeVariants contract. */
	export const badgeVariants = tv({
		base: "h-5 gap-1 rounded-4xl px-2 py-0.5 text-xs font-medium transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap [&>svg]:pointer-events-none",
		variants: {
			variant: {
				default: "text-primary-text",
				secondary: "text-secondary-foreground",
				accent: "text-primary-text",
				success: "tm-tinted [--tone:var(--positive)]",
				warning: "tm-tinted [--tone:var(--warning)]",
				destructive: "tm-tinted [--tone:var(--destructive)]",
				outline: "text-foreground",
				ghost: "text-muted-foreground",
				link: "text-primary-text underline-offset-4 hover:underline",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	/** The public BadgeVariant contract. */
	export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAnchorAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
	} = $props();
</script>

<svelte:element
	this={href ? "a" : "span"}
	bind:this={ref}
	data-slot="badge"
	data-material="pane"
	{href}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
