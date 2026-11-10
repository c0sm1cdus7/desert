// What each production file of src/ is for, and how many lines each folder may hold: its size on the day the tree was
// reorganized, plus 3%. Both live in tree.json; a new file names its purpose there before it lands.
import manifest from "./tree.json" with { type: "json" };
export const tree: Readonly<Record<string, string>> = manifest.files;
export const folderBudgets: Readonly<Record<string, number>> = manifest.folders;
