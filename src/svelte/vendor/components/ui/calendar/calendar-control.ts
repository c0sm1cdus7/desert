// The calendar's own control faces (design §5: the calendar keeps its own classes and never imports the button family).
// The pane material and the press and hover feedback come from the theme's utilities; a face's ink is its meaning.
export const calendarControl = "control-feedback inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

/** Day faces: the selected day carries the primary pane, today a neutral pane, every other day an interior. */
export const dayFaces = {
	selected: { material: "material-pane material-pane-primary", ink: "text-primary-foreground font-semibold" },
	today: { material: "material-pane", ink: "text-secondary-foreground" },
	day: { material: "material-interior", ink: "bg-transparent text-foreground border-0 font-normal text-left" },
} as const;
