// Writes GUARANTEES.md from the list of laws: `pnpm rules`.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "../support/sources.ts";
import { rulesText } from "./rules.ts";

writeFileSync(join(root, "GUARANTEES.md"), rulesText());
