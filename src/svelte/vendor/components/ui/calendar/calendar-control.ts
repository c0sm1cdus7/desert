// The calendar's own control faces (design §5: the calendar keeps its own classes and never imports the button family).
// The pane material and hover feedback come from the theme (`data-material`, `tm-control`); a face's ink is its meaning.
// F1-merge: utility control-feedback (lane F1a) replaces tm-control.
export const calendarControl = "tm-control inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

/** Day faces: the selected day carries the primary pane, today a neutral pane, every other day an interior. */
export const dayFaces = {
	selected: { material: "pane", ink: "text-primary-foreground font-semibold" },
	today: { material: "pane", ink: "text-secondary-foreground" },
	day: { material: "interior", ink: "bg-transparent text-foreground border-0 font-normal text-left" },
} as const;
