// One witness of ViewWorkspace: the notebook fixture program on its Home destination, with no panel open.
import { program } from "../../../../../tests/fixtures/view-program.ts";
import { viewEventOwnership } from "../../../../web/client/view-events.ts";
import type { CatalogSpecimen } from "../../types.d.ts";

export const ViewWorkspaceSpecimens = [
  { state: "default", props: { program, activeDestination: "home",
    resolved: { view: program.views[0], bindings: {}, disabledOutputs: [], owner: viewEventOwnership().sync([], false).main },
    panel: null, error: null, uncertain: false } },
] as const satisfies readonly CatalogSpecimen<"view-workspace">[];
