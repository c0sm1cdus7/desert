import { getContext, setContext, tick, untrack } from "svelte";
import { sidebarLayout } from "./sidebar-layout.svelte.js";
import { SIDEBAR_KEYBOARD_SHORTCUT } from "./constants.js";

type Getter<T> = () => T;
type FocusOrigin = { element: HTMLElement; index: number };
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';

export type SidebarStateProps = {
	panelId: string;
	available: Getter<boolean>;
	root: Getter<HTMLElement | null>;
	dockedBudget: Getter<HTMLElement | null>;
	/**
	 * The retained open preference for the docked presentation.
	 * We use a getter function here to support `bind:open` on the `Sidebar.Provider`
	 * component.
	 */
	open: Getter<boolean>;

	/**
	 * A function that sets the open state of the sidebar. To support `bind:open`, we need
	 * a source of truth for changing the open state to ensure it will be synced throughout
	 * the sub-components and any `bind:` references.
	 */
	setOpen: (open: boolean) => void;
};

class SidebarState {
	readonly props: SidebarStateProps;
	open = $derived.by(() => this.available && this.props.open());
	overlayOpen = $state(false);
	/** Visual preview only; no navigation, focus or modality is accepted mid-gesture. */
	revealOffset = $state<number | null>(null);
	revealedByGesture = $state(false);
	dismissOffset = $state(0);
	setOpen: SidebarStateProps["setOpen"];
	#layout: ReturnType<typeof sidebarLayout>;
	#overlayOrigin: FocusOrigin | undefined;
	state = $derived.by(() => (this.expanded ? "expanded" : "collapsed"));

	constructor(props: SidebarStateProps) {
		this.setOpen = value => { if (!value) this.revealedByGesture = false; props.setOpen(value); };
		this.#layout = sidebarLayout(props.root, props.dockedBudget);
		this.props = props;
		let previous: { presentation: "docked" | "overlay"; open: boolean } | undefined;
		$effect.pre(() => {
			const presentation = this.presentation, open = this.open;
			untrack(() => {
				if (previous && (previous.presentation !== presentation || previous.open !== open)) {
					const origin = this.focusOrigin();
					const ownsFocus = origin && (this.panel()?.contains(origin.element) ||
						(this.props.root()?.contains(origin.element) && origin.element.matches(this.trigger())));
					if (previous.presentation !== presentation) this.overlayOpen = false;
					if (ownsFocus) void this.restoreFocus(origin);
				}
				previous = { presentation, open };
			});
		});
	}

	get panelId() { return this.props.panelId; }
	get available() { return this.props.available(); }
	get expanded() { return this.available && (this.presentation === "overlay" ? this.overlayOpen : this.open); }
	get revealing() { return this.revealOffset !== null; }
	private panel() { return document.getElementById(this.panelId); }
	/** A control that shows or hides this sidebar: the vendor trigger, or the shell's navigation toggles (bar parts). */
	private trigger() { return '[data-sidebar="trigger"], [data-navigation-toggle] button'; }
	private focusOrigin(): FocusOrigin | undefined {
		const element = document.activeElement;
		if (!(element instanceof HTMLElement) || element === document.body) return;
		return { element, index: [...(this.panel()?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].indexOf(element) };
	}
	private usable(element: HTMLElement | null | undefined): element is HTMLElement {
		if (!element?.isConnected || element.closest('[inert], [hidden], [aria-hidden="true"]')) return false;
		const bounds = element.getBoundingClientRect();
		return bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== "hidden";
	}
	private async restoreFocus(origin?: FocusOrigin) {
		await tick();
		// A destination may already have intentionally claimed focus while closing.
		const active = document.activeElement;
		if (active instanceof HTMLElement && active !== document.body && this.usable(active)) return;
		if (this.usable(origin?.element)) { origin.element.focus({ preventScroll: true }); return; }
		const panel = this.panel();
		const equivalent = origin && origin.index >= 0 ? panel?.querySelectorAll<HTMLElement>(FOCUSABLE)[origin.index] : null;
		const preferred = equivalent ?? panel?.querySelector<HTMLElement>(`[aria-current="page"], ${this.trigger()}`);
		const external = [...(this.props.root()?.querySelectorAll<HTMLElement>(this.trigger()) ?? [])]
			.find(element => !panel?.contains(element) && this.usable(element));
		const target = [preferred, external, panel].find(element => this.usable(element));
		target?.focus({ preventScroll: true });
	}

	handleCloseAutoFocus = (event: Event) => {
		event.preventDefault();
		void this.restoreFocus(this.#overlayOrigin);
	};

	get presentation() { return this.#layout.presentation; }

	// Event handler to apply to the `<svelte:window>`
	handleShortcutKeydown = (e: KeyboardEvent) => {
		if (this.available && e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.toggle();
		}
	};

	setOverlayOpen = (value: boolean) => {
		if (value && !this.available) return;
		if (value && !this.overlayOpen) this.#overlayOrigin = this.focusOrigin();
		if (!value) this.revealedByGesture = false;
		this.overlayOpen = value;
	};

	toggle = () => {
		if (!this.available) return;
		return this.presentation === "overlay" ? this.setOverlayOpen(!this.overlayOpen) : this.setOpen(!this.open);
	};
}

const SYMBOL_KEY = "scn-sidebar";

/**
 * Instantiates a new `SidebarState` instance and sets it in the context.
 *
 * @param props The constructor props for the `SidebarState` class.
 * @returns  The `SidebarState` instance.
 */
export function setSidebar(props: SidebarStateProps): SidebarState {
	return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}

/**
 * Retrieves the `SidebarState` instance from the context. This is a class instance,
 * so you cannot destructure it.
 * @returns The `SidebarState` instance.
 */
export function useSidebar(): SidebarState {
	return getContext(Symbol.for(SYMBOL_KEY));
}
