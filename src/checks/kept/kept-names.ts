// Count journals themselves, never derived checks or writer sidecars.
import { existsSync, readdirSync } from "node:fs";
export const keptNames = (folder?: string): string[] =>
  folder && existsSync(folder)
    ? readdirSync(folder, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith(".sqlite") && !entry.name.endsWith(".writer.sqlite"))
        .map(entry => entry.name)
        .sort()
    : [];
