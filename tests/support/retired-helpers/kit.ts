// Historical fixtures preserve checks of retired APIs without shipping those APIs in the base.
import { allowed } from "../../../src/house/identities/identity-permissions.ts";
import type { House } from "../../../src/house/members.ts";
import { systemTool } from "../../../src/house/system-tools.ts";
export const assigned = (house: House, by: string, tools: readonly string[]): string[] =>
  tools.filter(tool => !systemTool(tool) && allowed(house, by, tool));
