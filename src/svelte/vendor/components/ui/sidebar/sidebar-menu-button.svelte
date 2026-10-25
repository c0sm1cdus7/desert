<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const sidebarMenuButtonVariants = tv({
		base: "control-feedback [&>*]:control-feedback-content outline-none focus-visible:-outline-offset-3 disabled:pointer-events-none data-active:text-primary-text gap-2 rounded-md p-2 min-h-0 text-left text-sm group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! data-active:font-medium peer/menu-button group/menu-button flex w-full items-center overflow-hidden aria-disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_[data-button-content]>span:last-child]:truncate [&>span:last-child:not([data-button-content])]:truncate",
		variants: {
			variant: {
				default: "",
				outline: "",
			},
			size: {
				default: "h-8 text-sm",
				sm: "h-7 text-xs",
				lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type SidebarMenuButtonVariant = VariantProps<typeof sidebarMenuButtonVariants>["variant"];
	export type SidebarMenuButtonSize = VariantProps<typeof sidebarMenuButtonVariants>["size"];
</script>

<script lang="ts">
	import { mergeProps } from "bits-ui";
	import { Button as SharedButton, type ButtonProps } from "@desert/svelte/vendor/components/ui/button/index.js";
	import { pressFeedbackProps } from "@desert/svelte/catalog/mechanisms/press-feedback/press-feedback.ts";
	import * as Tooltip from "@desert/svelte/vendor/components/ui/tooltip/index.js";
	import { cn, type WithElementRef, type WithoutChildrenOrChild } from "@desert/svelte/vendor/utils.js";
	import { useSidebar } from "./context.svelte.js";
	import type { ComponentProps, Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		child,
		variant = "default",
		size = "default",
		isActive = false,
		tooltipContent,
		tooltipContentProps,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
		isActive?: boolean;
		variant?: SidebarMenuButtonVariant;
		size?: SidebarMenuButtonSize;
		tooltipContent?: Snippet | string;
		tooltipContentProps?: WithoutChildrenOrChild<ComponentProps<typeof Tooltip.Content>>;
		child?: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	const sidebar = useSidebar();

	const buttonProps = $derived({
		class: cn(sidebarMenuButtonVariants({ variant, size }), variant === "outline" ? "material-pane" : "material-interior", className),
		"data-slot": "sidebar-menu-button",
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-active": isActive ? true : undefined,
		...restProps,
	});
</script>

{#snippet Button({ props }: { props?: Record<string, unknown> })}
	{@const mergedProps = mergeProps(buttonProps, props)}
	{#if child}
		{@render child({ props: { ...mergedProps, ...pressFeedbackProps } })}
	{:else}
		<SharedButton bind:ref variant="row" {...mergedProps as ButtonProps}>
			{@render children?.()}
		</SharedButton>
	{/if}
{/snippet}

{#if !tooltipContent}
	{@render Button({})}
{:else}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render Button({ props })}
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content
			side="right"
			align="center"
			hidden={sidebar.state !== "collapsed" || sidebar.presentation === "overlay"}
			{...tooltipContentProps}
		>
			{#if typeof tooltipContent === "string"}
				{tooltipContent}
			{:else if tooltipContent}
				{@render tooltipContent()}
			{/if}
		</Tooltip.Content>
	</Tooltip.Root>
{/if}
