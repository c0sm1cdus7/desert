<script lang="ts">
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import { pressFeedbackProps } from "@desert/svelte/catalog/mechanisms/press-feedback/press-feedback.ts";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		variant = "ghost",
		size = "icon-sm",
		onclick,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		variant?: "ghost" | "secondary";
		size?: "icon-sm" | "icon";
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const sidebar = useSidebar();
	// The icon button this family draws itself: the button family's ghost and secondary icon recipes, resolved.
	const base = "inline-flex shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-[var(--radius)] type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
	const inks = { ghost: "bg-transparent text-foreground", secondary: "text-secondary-foreground" } as const;
	const sizes = { "icon-sm": "size-9", icon: "size-10" } as const;
	let material = $derived(/\bmaterial-(?:pane|interior)\b/.test(cn(className)) ? undefined : variant === "ghost" ? "material-interior" : "material-pane");
</script>

<button
	{...pressFeedbackProps}
	bind:this={ref}
	data-sidebar="trigger"
	data-slot="sidebar-trigger"
	class={cn(base, inks[variant], sizes[size], material, "control-feedback", className)}
	type="button"
	aria-controls={sidebar.panelId}
	aria-expanded={sidebar.expanded}
	onclick={(e) => {
		onclick?.(e);
		if (!e.defaultPrevented) sidebar.toggle();
	}}
	{...restProps}
	data-variant={variant}
>
	<span class="control-feedback-content" data-button-content>
		<PanelLeftIcon class="cn-rtl-flip" />
		<span class="sr-only">Toggle Sidebar</span>
	</span>
</button>
