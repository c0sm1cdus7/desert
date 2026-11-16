// A sabotage names both the guarantee it breaks and the diagnostic it must produce.
import { expect } from "vitest";
import type { Check } from "../../src/checks/promises/promised-stage.ts";

type Reasons = string | readonly string[];
export async function failing(checks: readonly Check[], why: Reasons | ((name: string) => Reasons)): Promise<string[]> {
  const failed: string[] = [];
  for (const check of checks) {
    try {
      await check.run();
    } catch (error) {
      expect(error, check.name).toBeInstanceOf(Error);
      const reasons = typeof why === "function" ? why(check.name) : why;
      const choices = typeof reasons === "string" ? [reasons] : reasons;
      const message = error instanceof Error ? error.message : "";
      expect(
        choices.some(reason => message.includes(reason)),
        `${check.name}: ${message}`,
      ).toBe(true);
      failed.push(check.name);
    }
  }
  return failed;
}
