// The gate's shop derives its version from its calculations, including the base, with no manual evidence exemption.
import { join } from "node:path";
import { codeProjectionVersion } from "../../src/programs/calculation-version.ts";
import { shopProgram, shopShown } from "./shop.ts";
export const program = {
  ...shopProgram,
  projectionVersion: codeProjectionVersion([
    join(import.meta.dirname, "../../src"),
    join(import.meta.dirname, "shop.ts"),
    join(import.meta.dirname, "shop-program.ts"),
  ]),
};
export const shown = shopShown;
