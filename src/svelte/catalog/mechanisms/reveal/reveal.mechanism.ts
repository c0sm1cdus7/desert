// Reveal a region inside its scroll viewport (DESIGN §2): owned by view-region, used by the shell. It replaces
// infra/catalog-search-focus.ts, whose DOM no infra module may run (rule I).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const RevealMechanism = defineMechanism({ id: "reveal", owner: "view-region", files: ["reveal.ts"] } as const);
