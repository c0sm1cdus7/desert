<script lang="ts">
	import * as Tooltip from "@desert/svelte/vendor/components/ui/tooltip/index.js";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import {
		SIDEBAR_COOKIE_MAX_AGE,
		SIDEBAR_COOKIE_NAME,
		SIDEBAR_WIDTH,
		SIDEBAR_WIDTH_ICON,
	} from "./constants.js";
	import { setSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		open = $bindable(true),
		available = true,
		onOpenChange = () => {},
		contentMinWidth = "32rem",
		class: className,
		style,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		available?: boolean;
		onOpenChange?: (open: boolean) => void;
		/** Reading space reserved beside the docked sidebar, in CSS length units. */
		contentMinWidth?: string;
	} = $props();

	const uid = $props.id();
	const panelId = `sidebar-${uid}`;
	let dockedBudget = $state<HTMLElement | null>(null);
	const sidebar = setSidebar({
		panelId,
		available: () => available,
		root: () => ref,
		dockedBudget: () => dockedBudget,
		open: () => open,
		setOpen: (value: boolean) => {
			open = value;
			onOpenChange(value);

			// This sets the cookie to keep the sidebar state.
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
		},
	});
</script>

<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<Tooltip.Provider delayDuration={0}>
	<div
		data-slot="sidebar-wrapper"
		data-presentation={sidebar.presentation}
		data-state={sidebar.state}
		style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; --sidebar-content-min-width:{contentMinWidth}; {style}"
		class={cn(
			"group/sidebar-wrapper relative flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
			// The theme density utility of the presentation; the owner (shell) gives the same density to the layout it hosts.
			sidebar.presentation === "overlay" ? "density-comfortable" : "density-compact",
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		<!-- CSS resolves rem/calc/custom properties; the clipped probe cannot widen
		     the page. ResizeObserver reacts to host, sidebar and text-size changes. -->
		<div aria-hidden="true" class="pointer-events-none invisible absolute size-0 overflow-hidden">
			<div bind:this={dockedBudget} class="h-px w-[calc(var(--sidebar-width)_+_var(--sidebar-content-min-width))]"></div>
		</div>
		{@render children?.()}
	</div>
</Tooltip.Provider>
