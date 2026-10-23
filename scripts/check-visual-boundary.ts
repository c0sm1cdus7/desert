// The pre-catalog visual gate, as the real build runs it. Removed in slice 1 when the catalog gate replaces it.
import { resolve } from "node:path";
import { runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

const root = resolve(import.meta.dirname, "..");
if (process.argv[2] !== "--closed-boundaries") throw new Error("Use --closed-boundaries");
await runWithVisualBoundaries(root, async () => undefined);
console.log("Migrated closed component/adapter boundaries passed. Legacy ownership remains NOT QUALIFIED.");
