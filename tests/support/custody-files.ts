import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
/** Every file, including SQLite auxiliaries and nested directories, while the writer can still be open. */
export function containing(home: string, marker: string | Uint8Array): string[] {
  return readdirSync(home, { withFileTypes: true }).flatMap(entry => {
    const path = join(home, entry.name);
    if (entry.isDirectory()) return containing(path, marker);
    return readFileSync(path).includes(Buffer.from(marker)) ? [path] : [];
  });
}
