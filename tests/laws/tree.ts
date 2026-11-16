// Each production file names its purpose in tree.json before it lands.
import manifest from "./tree.json" with { type: "json" };
export const tree: Readonly<Record<string, string>> = manifest.files;
