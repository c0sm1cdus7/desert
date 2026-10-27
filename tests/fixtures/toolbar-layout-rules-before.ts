// The bar.css rules that drew only the deleted toolbar-layout composition's rows (a row without data-bar-row), as they stood
// before the slice 3 close-out removed them from the live stylesheet. Frozen pages still mount that composition (a frozen
// Viewer, the frozen toolbar-layout of a "before" side), so renderer-css.ts appends these rules to every compiled theme; no
// live row matches them (every bar's row carries data-bar-row). Never shipping CSS.
export const toolbarLayoutRulesBefore = `
[data-piece="toolbar"] .toolbar-row:not([data-bar-row]) :is([data-slot="button"],[data-slot="sidebar-trigger"]):not([data-media-thumbs] button) {
  height:var(--toolbar-target); min-height:var(--toolbar-target);
}
[data-piece="toolbar"] .toolbar-row:not([data-bar-row]) :is(.toolbar-action > button,[data-toolbar-controls] button,
  [data-catalog-navigation-actions] > button,[data-slot="sidebar-trigger"],[data-catalog-search-toggle],button:has(> [data-button-content] > svg):not([data-action])) {
  width:var(--toolbar-target); flex-shrink:0; padding:var(--toolbar-inset);
}
[data-piece="toolbar"][data-toolbar-purpose="commit"] > .toolbar-row:not([data-bar-row]) > * { flex:0 1 auto; min-width:0; }
[data-piece="toolbar"][data-toolbar-purpose="commit"] > .toolbar-row:not([data-bar-row]) button { white-space:nowrap; }
[data-piece="toolbar"][data-toolbar-purpose="steps"] > .toolbar-row:not([data-bar-row]) > button { width:100%; max-width:none; min-width:0; }
/* The label and glyph rules bar.css and catalog-shell.css held for every toolbar action, kept here for the old rows only. */
[data-piece="toolbar"] .toolbar-row:not([data-bar-row]) .toolbar-action [data-button-label] { visibility:hidden; }
[data-piece="toolbar"] .toolbar-row:not([data-bar-row]) .toolbar-action [data-button-glyph] { visibility:visible; }
[data-place-toolbar]:not(:has([data-bar-row])) [data-button-label] { visibility:hidden; }
[data-place-toolbar]:not(:has([data-bar-row])) [data-button-glyph] { visibility:visible; }
`;
