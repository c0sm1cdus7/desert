import { existsSync, readFileSync } from "node:fs";
import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import { record } from "../positions/secret-positions.ts";
export class SecretProtectionError extends Error {
  readonly code = "E-SECRET-PROTECTION";
  readonly file: string;
  constructor(file: string) {
    super(secretTexts.protection(file));
    this.file = file;
  }
}
export function protectedAlready(file: string): boolean {
  if (!existsSync(file)) return false;
  try {
    const mark: unknown = JSON.parse(readFileSync(file, "utf8"));
    const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
    if (!record(mark) || ![1, 2].includes(Number(mark.version)) || !count(mark.reviewed) || !count(mark.unreviewable))
      throw new SecretProtectionError(file);
    if (mark.version === 1) return false; // Version one did not review program facts.
    if (mark.version !== 2 || !count(mark.reviewedFacts)) throw new SecretProtectionError(file);
    return true;
  } catch {
    throw new SecretProtectionError(file);
  }
}
