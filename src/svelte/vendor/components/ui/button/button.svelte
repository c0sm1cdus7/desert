<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	/** The public buttonVariants contract. */
	export const buttonVariants = tv({
        base: "inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-[var(--radius)] type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants: {
            spin: { true: "[&_svg[data-icon]]:animate-spin" },
            variant: {
                default: "text-primary-foreground font-semibold",
                outline: "text-foreground",
                secondary: "text-secondary-foreground",
                ghost: "bg-transparent text-foreground",
                grip: "bg-transparent text-muted-foreground rounded-lg",
                destructive: "text-destructive",
                row: "bg-transparent text-foreground border-0 rounded-none justify-start whitespace-normal h-auto text-left font-normal w-full",
                field: "bg-transparent text-foreground border-0 rounded-none justify-start w-full font-normal",
                well: "text-foreground rounded-[var(--radius)] justify-start text-left whitespace-normal w-full font-normal",
            },
            size: {
                default: "min-h-11 px-4 py-2", xs: "min-h-6 px-2", sm: "min-h-9 px-3",
                icon: "size-10", "icon-xs": "size-6", "icon-sm": "size-9", "icon-lg": "size-11",
                row: "px-4 py-3", field: "min-h-10 px-3", well: "p-0",
                avatar: "size-[5.625rem] p-0 relative overflow-hidden rounded-full",
                "label-remove": "size-[28px] min-h-[28px] p-0 [@media(pointer:coarse)]:size-[44px] [@media(pointer:coarse)]:min-h-[44px]",
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
			presentation?: "standard" | "toolbar-return" | "search-toggle" | "media-tile" | "media-list-item" | "media-collection" | "media-cover-choice" | "record-row" | "selection-well" | "selection-inline" | "selection-context" | "summary-widget";
			searching?: boolean;
			/** Grouping and wrapping are finite recipe policies, never consumer CSS. */
			wrap?: boolean;
			onready?: (element: HTMLButtonElement | HTMLAnchorElement | null) => void;
		};
</script>

<script lang="ts">
	import { pressFeedbackProps } from "./press-feedback.js";
	import Search from "@lucide/svelte/icons/search";
	import X from "@lucide/svelte/icons/x";
	let {
		class: className,
		variant = "default",
		size = "default",
		spin = false,
		presentation = "standard",
		searching = false,
		wrap = false,
		onready,
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
	// The material is the variant's unless the caller names one (a sidebar row); prominence tints the pane.
	const interiors: readonly ButtonVariant[] = ["ghost", "grip", "row", "field"];
	let material = $derived(/\bmaterial-(?:pane|interior)\b/.test(cn(className)) ? undefined
		: interiors.includes(variant) ? "material-interior" : variant === "default" ? "material-pane material-pane-primary" : "material-pane");
	$effect(() => { onready?.(ref instanceof HTMLButtonElement || ref instanceof HTMLAnchorElement ? ref : null); return () => onready?.(null); });
</script>

{#if href}
	<a
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-summary-widget={presentation === "summary-widget" || undefined}
		data-media-grid-item={presentation === "media-tile" || presentation === "media-list-item" || undefined}
		data-media-list-item={presentation === "media-list-item" || undefined}
		data-media-collection-card={presentation === "media-collection" || undefined}
		data-media-reference-choice={presentation === "media-cover-choice" || undefined}
		class={cn(buttonVariants({ variant, size, spin }), material, variant === "grip" ? "control-focus" : "control-feedback", wrap && "max-w-full min-w-0 whitespace-normal text-balance h-auto", presentation.startsWith("selection-") && "w-fit max-w-full justify-between gap-3 rounded-[var(--radius)]", presentation === "selection-well" && "field-well overflow-hidden", presentation === "selection-context" && "justify-self-end", presentation === "record-row" && "record-button w-full min-h-11 text-start items-center justify-between gap-4 px-4 py-3 focus-visible:outline-offset-[-3px]", presentation === "toolbar-return" && "sr-only", className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
		data-variant={variant}
	>
		<span class="control-feedback-content" data-button-content>{@render children?.()}</span>
	</a>
{:else}
	<button
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-summary-widget={presentation === "summary-widget" || undefined}
		data-media-grid-item={presentation === "media-tile" || presentation === "media-list-item" || undefined}
		data-media-list-item={presentation === "media-list-item" || undefined}
		data-media-collection-card={presentation === "media-collection" || undefined}
		data-media-reference-choice={presentation === "media-cover-choice" || undefined}
		class={cn(buttonVariants({ variant, size, spin }), material, variant === "grip" ? "control-focus" : "control-feedback", wrap && "max-w-full min-w-0 whitespace-normal text-balance h-auto", presentation.startsWith("selection-") && "w-fit max-w-full justify-between gap-3 rounded-[var(--radius)]", presentation === "selection-well" && "field-well overflow-hidden", presentation === "selection-context" && "justify-self-end", presentation === "record-row" && "record-button w-full min-h-11 text-start items-center justify-between gap-4 px-4 py-3 focus-visible:outline-offset-[-3px]", presentation === "toolbar-return" && "sr-only", className)}
		data-toolbar-scroll-top={presentation === "toolbar-return" || undefined}
		data-catalog-search-toggle={presentation === "search-toggle" || undefined}
		data-catalog-search-cancel={presentation === "search-toggle" && searching || undefined}
		{type}
		{disabled}
		{...restProps}
		data-variant={variant}
	>
		<span class="control-feedback-content" data-button-content>{#if presentation === "search-toggle"}<Search data-search-icon="open" aria-hidden="true" /><X data-search-icon="close" aria-hidden="true" />{:else}{@render children?.()}{/if}</span>
	</button>
{/if}

<style>
  :global([data-summary-widget]) { width:min(100%,22rem); max-width:100%; min-width:0; min-height:13rem; padding:var(--space-4,1rem); border-radius:var(--radius-group); text-align:start; white-space:normal; align-items:stretch; }
  :global([data-summary-widget] > [data-button-content]) { display:flex; flex-direction:column; align-items:stretch; gap:var(--space-4,1rem); }
  @layer components {
    :global([data-slot="button"]) { min-height:2.75rem; }
    :global([data-button-content]) { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
  }
  :global([data-catalog-search-toggle]) { position:relative; pointer-events:auto; }
  :global([data-catalog-search-toggle] [data-button-content]) { display:grid; place-items:center; }
  :global([data-catalog-search-toggle] svg) { grid-area:1/1; transition:opacity 180ms var(--ease-tm),transform 220ms var(--ease-tm); }
  :global([data-catalog-search-toggle] [data-search-icon="close"]) { opacity:0; transform:rotate(-90deg) scale(.75); }
  :global([data-catalog-search-actions][data-expanded="true"] [data-search-icon="open"]) { opacity:0; transform:rotate(90deg) scale(.75); }
  :global([data-catalog-search-actions][data-expanded="true"] [data-search-icon="close"]) { opacity:1; transform:none; }
  :global([data-media-reference-choice]) { position:relative; aspect-ratio:4/3; overflow:hidden; width:100%; }
  :global([data-media-reference-choice] [data-button-content]) { height:100%; }
  :global([data-media-collection-card]) { position:relative; width:100%; display:block; overflow:hidden; text-align:start; }
  :global([data-media-collection-card] > [data-button-content]) { display:block; }
  :global([data-media-grid-item]) { position:relative; display:block; width:100%; aspect-ratio:4/3; overflow:hidden; border-radius:var(--radius); }
  :global([data-media-grid-item] > [data-button-content]) { height:100%; }
  :global([data-media-grid-item][aria-current="true"]) { outline:2px solid var(--primary); outline-offset:2px; }
  :global([data-media-list-item]) { aspect-ratio:auto; border-radius:0; }
  :global([data-media-list-item] > [data-button-content]) { display:flex; align-items:center; gap:var(--stack-gap,16px); padding:12px 16px; }
</style>
