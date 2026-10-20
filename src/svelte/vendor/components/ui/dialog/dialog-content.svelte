<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import ScrollLock from "@desert-internal/bits-scroll-lock";
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
	import { cn, type WithoutChildrenOrChild } from "@desert/svelte/vendor/utils.js";
	import * as Dialog from "./index.js";
	import DialogPortal from "./dialog-portal.svelte";
	import type { Snippet } from "svelte";
	import type { ComponentProps } from "svelte";
	import { surfaceFocus } from "@desert/svelte/pieces/surface-focus.svelte.ts";
  import { useSurfaceTypography } from '@desert/svelte/pieces/surface-typography.svelte.ts';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		presentation = "default",
		overlayStyle,
		adaptiveModal,
		preventScroll = true,
		restoreScrollDelay = null,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
		presentation?: "default" | "panel" | "message" | "media";
		overlayStyle?: string;
		/** Renderer-owned adaptive panels preserve this content node across modality. */
		adaptiveModal?: boolean;
	} = $props();
	const focus = surfaceFocus(() => ref);
  const density = useSurfaceTypography();
</script>

<DialogPortal {...portalProps}>
	{#if adaptiveModal !== false}<Dialog.Overlay presentation={presentation} style={overlayStyle} />{/if}
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
    data-material="pane"
    data-type-density={density()}
		onOpenAutoFocus={focus}
		class={cn(
			presentation === "default"
				? "centered-dialog text-popover-foreground grid max-w-[calc(100%_-_2rem)] gap-4 rounded-xl p-4 text-sm sm:max-w-sm z-50 w-full overflow-y-auto outline-none"
				: presentation === "panel" ? "drawer transient-content" : presentation === "media" ? "media-viewer" : "problem",
			className
		)}
		{...restProps}
		preventScroll={adaptiveModal === undefined ? preventScroll : false}
		{restoreScrollDelay}
	>
		{#snippet child({ props, open })}
		<!-- Bits reads preventScroll only when its lock mounts. Adapt only that
		     lifetime; the dialog, draft, selection and focus node stay mounted. -->
		{#if adaptiveModal && open && preventScroll}<ScrollLock {restoreScrollDelay} />{/if}
		<div {...props} role={adaptiveModal === false ? 'region' : 'dialog'}
			aria-modal={adaptiveModal === false ? undefined : 'true'}>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-2 right-2" size="icon-sm" {...props}>
						<XIcon  />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
		</div>
		{/snippet}
	</DialogPrimitive.Content>
</DialogPortal>
