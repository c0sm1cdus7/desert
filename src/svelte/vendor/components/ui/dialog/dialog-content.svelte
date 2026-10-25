<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import ScrollLock from "@desert-internal/bits-scroll-lock";
	import { cn, type WithoutChildrenOrChild } from "@desert/svelte/vendor/utils.js";
	import * as Dialog from "./index.js";
	import DialogPortal from "./dialog-portal.svelte";
	import type { Snippet } from "svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		presentation = "default",
		overlayStyle,
		adaptiveModal,
		preventScroll = true,
		restoreScrollDelay = null,
		labelledby,
		describedby,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		presentation?: "default" | "panel" | "message" | "media";
		overlayStyle?: string;
		/** Renderer-owned adaptive panels preserve this content node across modality. */
		adaptiveModal?: boolean;
		/** The ids of a visible heading and sentence the owner draws, which name and describe the dialog instead of a Title
		 *  and Description of this family. */
		labelledby?: string;
		describedby?: string;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	{#if adaptiveModal !== false}<Dialog.Overlay presentation={presentation} style={overlayStyle} />{/if}
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn("material-pane",
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
			aria-modal={adaptiveModal === false ? undefined : 'true'}
			aria-labelledby={labelledby ?? props["aria-labelledby"]} aria-describedby={describedby ?? props["aria-describedby"]}>
		{@render children?.()}
		</div>
		{/snippet}
	</DialogPrimitive.Content>
</DialogPortal>
