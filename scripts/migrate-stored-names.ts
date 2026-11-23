// Migrates a house journal (English names, a language per identity) and a model account: `pnpm migrate-names`.
import { checkStoredNames, migrateStoredNames, type StoredJournal } from "../src/runtime/stored-names.ts";
import { storedNamesTexts } from "../src/texts/stored-names.texts.ts";

const flags = ["--backup", "--journal", "--account"] as const;
/** The command's own flags, each once with its value; anything else, or neither file, is a usage error. */
export function migrationArguments(args: readonly string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index] ?? "";
    const value = args[index + 1];
    if (!flags.some(known => known === flag) || value === undefined || values.has(flag)) return undefined;
    values.set(flag, value);
  }
  const files: [string, StoredJournal][] = [];
  const journal = values.get("--journal");
  const account = values.get("--account");
  if (journal !== undefined) files.push([journal, "house"]);
  if (account !== undefined) files.push([account, "account"]);
  return files.length ? { backup: values.get("--backup"), files } : undefined;
}
export function migrationCommand(args: readonly string[], say: (line: string) => void): number {
  const parsed = migrationArguments(args);
  if (!parsed) {
    say(storedNamesTexts.usage);
    return 2;
  }
  if (parsed.backup === undefined) {
    say(storedNamesTexts.backupRequired);
    return 2;
  }
  for (const [file, journal] of parsed.files)
    try {
      const result = migrateStoredNames(file, journal, parsed.backup);
      checkStoredNames(file, journal);
      say(storedNamesTexts.migrated(file, result.changed, result.rows, result.spoken, result.backup));
    } catch (error) {
      say(storedNamesTexts.failed(file, error instanceof Error ? error.message : String(error)));
      return 1;
    }
  return 0;
}
if (import.meta.main) process.exitCode = migrationCommand(process.argv.slice(2), line => console.error(line));
