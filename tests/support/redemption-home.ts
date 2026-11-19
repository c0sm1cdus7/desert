// Each redemption fixture explicitly trusts its disposable HOME, including child processes.
import { afterEach, vi } from "vitest";
import { mkdtempSync, realpathSync } from "node:fs";
import { doorHouse as house } from "./door-house.ts";
export { invitationCode } from "./door-house.ts";
afterEach(() => vi.unstubAllEnvs());
export function redemptionHome(prefix: string) {
  const home = realpathSync(mkdtempSync(prefix));
  vi.stubEnv("HOME", home);
  return home;
}
export function doorHouse(...args: Parameters<typeof house>) {
  const h = house(...args);
  vi.stubEnv("HOME", h.home);
  return h;
}
