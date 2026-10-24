// F1-merge: text-input's editor-capacity.ts (lane F1b, becoming field) still imports this path. Field lists the
// toolbar-geometry mechanism and imports mechanisms/toolbar-geometry/toolbar-bounds.ts; then this re-export is deleted.
export { toolbarBounds } from "../catalog/mechanisms/toolbar-geometry/toolbar-bounds.ts";
