// The theme: design tokens and the element defaults (the only element selectors and global CSS of the catalog).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const ThemeMechanism = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css", "base.css"] } as const);
