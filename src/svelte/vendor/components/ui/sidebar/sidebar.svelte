<script lang="ts">
	import * as Dialog from "@desert/svelte/vendor/components/ui/dialog/index.js";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import { SIDEBAR_OVERLAY_WIDTH } from "./constants.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		side = "left",
		variant = "sidebar",
		collapsible = "offcanvas",
		overlayTitle = "Sidebar",
		overlayDescription = "Displays overlay navigation.",
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		side?: "left" | "right";
		variant?: "sidebar" | "floating" | "inset";
		collapsible?: "offcanvas" | "icon" | "none";
		overlayTitle?: string;
		overlayDescription?: string;
	} = $props();

	const sidebar = useSidebar();
</script>

{#if collapsible === "none"}
	<div
		data-material="pane"
		data-sidebar="sidebar"
		class={cn(
			"flex h-full w-(--sidebar-width) flex-col text-sidebar-foreground",
			className
		)}
		bind:this={ref}
		{...restProps}
		id={sidebar.panelId}
	>
		{@render children?.()}
	</div>
{:else if sidebar.presentation === "overlay"}
	<Dialog.Root bind:open={() => sidebar.overlayOpen, (v) => sidebar.setOverlayOpen(v)} {...restProps}>
		<Dialog.Content
			bind:ref
			presentation="panel"
			density="comfortable"
			forceMount={sidebar.revealing}
			preventScroll={!sidebar.revealing}
			data-revealing={sidebar.revealing || undefined}
			data-gesture-enter={sidebar.revealedByGesture || undefined}
			data-edge={side}
			data-sidebar="sidebar"
			data-slot="sidebar"
			data-presentation="overlay"
			id={sidebar.panelId}
			inert={!sidebar.overlayOpen}
			onCloseAutoFocus={sidebar.handleCloseAutoFocus}
			class={cn(
				"p-0 text-sidebar-foreground",
				className
			)}
			style="--panel-width: {SIDEBAR_OVERLAY_WIDTH}; transform:{sidebar.revealing ? `translateX(calc(-100% - var(--surface-inset) + ${sidebar.revealOffset}px))` : `translateX(${-sidebar.dismissOffset}px)`};"
		>
			<Dialog.Title class="sr-only">{overlayTitle}</Dialog.Title>
			<Dialog.Description class="sr-only">{overlayDescription}</Dialog.Description>
			<div class="flex h-full min-h-0 w-full flex-col">
				{@render children?.()}
			</div>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<div
		bind:this={ref}
		class="group peer text-sidebar-foreground"
		data-state={sidebar.state}
		data-collapsible={sidebar.state === "collapsed" ? collapsible : ""}
		data-variant={variant}
		data-side={side}
		data-slot="sidebar"
	>
		<!-- Reserve the docked sidebar's space inside its provider. -->
		<div
			data-slot="sidebar-gap"
			class={cn(
				"transition-[width] duration-200 ease-linear relative w-(--sidebar-width) bg-transparent",
				"group-data-[collapsible=offcanvas]:w-0",
				"group-data-[side=right]:rotate-180",
				variant === "floating" || variant === "inset"
					? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_(--spacing(4)))]"
					: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
			)}
		></div>
		<div
			data-slot="sidebar-container"
			data-side={side}
			data-revealing={sidebar.revealing || undefined}
			data-gesture-enter={sidebar.revealedByGesture && sidebar.open || undefined}
			style:transform={sidebar.revealing ? `translateX(${sidebar.revealOffset}px)` : sidebar.open ? `translateX(${-sidebar.dismissOffset}px)` : undefined}
			class={cn(
				"absolute inset-y-0 z-10 flex h-full w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:start-0 data-[side=left]:group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)_*_-1)] data-[side=right]:end-0 data-[side=right]:group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)_*_-1)]",
				// Adjust the padding for floating and inset variants.
				variant === "floating" || variant === "inset"
					? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_(--spacing(4))_+_2px)]"
					: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
				className
			)}
			{...restProps}
			id={sidebar.panelId}
			tabindex="-1"
			inert={!sidebar.open && collapsible === "offcanvas"}
			aria-hidden={!sidebar.open && collapsible === "offcanvas" ? true : undefined}
		>
			<div
				data-sidebar="sidebar"
				data-slot="sidebar-inner"
				data-material="pane"
				class="group-data-[variant=floating]:rounded-lg flex size-full flex-col"
			>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
