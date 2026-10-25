// The stylesheet rules the frozen pre-shell workspace (fixtures/catalog-workspace-before.ts) relied on, as they stood
// before the shell, the field, the bar and the icon took them as their own rules on their own marks (lane N2): the
// frozen markup still draws the old marks (data-catalog-navigation, the vendor search well, the old toolbar rows), so a
// parity test that mounts it adds these rules to its page. Never shipping CSS.
export const workspaceOwnerRulesBefore = `
[data-renderer-profile="apple-reference"][data-catalog-navigation] { display:flex; flex-direction:column; height:100%; min-height:0; background:transparent; }
[data-catalog-navigation] [data-slot="sidebar-group"] { padding:0 var(--navigation-group-inset); }
[data-catalog-navigation] [data-slot="sidebar-group"] + [data-slot="sidebar-group"] { margin-top:22px; }
[data-catalog-navigation] [data-slot="sidebar-group-label"] { height:auto; padding:8px var(--navigation-row-inset); font:600 var(--text-caption)/var(--text-caption--line-height) var(--font-sans); color:var(--muted-foreground); }
[data-catalog-navigation] [data-slot="sidebar-menu"] { gap:0; }
[data-catalog-navigation] [data-slot="sidebar-menu-button"] { height:auto; min-height:32px; padding:6px var(--navigation-row-inset); gap:9px; font-size:var(--text-body); line-height:var(--text-body--line-height); font-weight:var(--text-body--font-weight); border-radius:8px; }
[data-catalog-navigation] [data-slot="sidebar-menu-button"] :is([data-button-content],[data-button-content] > span:last-child) { white-space:normal; overflow:visible; text-overflow:clip; overflow-wrap:anywhere; }
[data-catalog-navigation] [data-slot="sidebar-menu-button"] svg { width:1.125em; height:1.125em; }
[data-presentation="overlay"] [data-catalog-navigation] [data-slot="sidebar-menu-button"] { min-height:44px; }
@media (pointer:coarse) { [data-catalog-navigation] [data-slot="sidebar-menu-button"] { min-height:44px; } }
[data-navigation-return] [data-piece="toolbar"] { overflow:visible; }
[data-search-field] [data-slot="input-group-addon"] svg { width:1.125em; height:1.125em; }
[data-slot="sidebar-wrapper"][data-presentation="overlay"] [data-search-field] { padding-block:0; }
[data-slot="sidebar-wrapper"][data-presentation="overlay"] [data-search-field] [data-slot="input-group-button"] { width:44px; height:44px; min-height:44px; }
[data-piece="toolbar"][data-toolbar-overlay] > .toolbar-row > * { pointer-events:auto; }
@media (max-height:640px) { [data-piece="toolbar"] .toolbar-availability .bank-status > span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } }
`;
