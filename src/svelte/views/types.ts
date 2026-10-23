import type { ViewProgram } from "../../views/program-schema.ts";
import type { OwnedResolvedPanel, OwnedResolvedView, OwnedViewEvent } from "../../web/client/view-events.ts";

/** Private catalog composition boundary: resolved data and typed events only. */
export interface WorkspaceProps {
  readonly program: ViewProgram;
  readonly activeDestination: string;
  readonly resolved: OwnedResolvedView;
  readonly panel?: OwnedResolvedPanel | null;
  readonly error: string | null;
  readonly uncertain: boolean;
  readonly onevent: (event: OwnedViewEvent) => void;
  readonly onnavigate: (destination: string) => void;
}
