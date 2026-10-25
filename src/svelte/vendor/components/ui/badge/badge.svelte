<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	/** The public badgeVariants contract. */
	export const badgeVariants = tv({
		base: "[--tag-radius:.375rem] [--tag-inset:3px] min-h-5 gap-1 rounded-[var(--tag-radius)] px-2 py-px text-xs font-medium transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! group/badge inline-flex w-fit max-w-full min-w-0 shrink items-center justify-center overflow-hidden whitespace-normal [overflow-wrap:anywhere] [&>svg]:pointer-events-none",
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
		removable = false,
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
		removable?: boolean;
	} = $props();
</script>

<svelte:element
	this={href ? "a" : "span"}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn("material-pane", badgeVariants({ variant }), removable && "py-[var(--tag-inset)] pr-[var(--tag-inset)] pl-[.65rem] gap-[.3rem]", className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
