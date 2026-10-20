import type { BankEvent } from "../../interaction/bank-events.ts";
import type { ViewProgram } from "../../views/program-schema.ts";
import type { ResolvedPanel, ResolvedView } from "../../views/resolved.ts";
import type { HumanSurface, ValidateInput } from "../../web/types.ts";

/** Private catalog composition boundary: resolved data and typed events only. */
export interface WorkspaceProps {
  readonly program: ViewProgram;
  readonly activeDestination: string;
  readonly resolved: ResolvedView;
  readonly surface: HumanSurface;
  readonly validateInput: ValidateInput;
  readonly panel?: ResolvedPanel | null;
  readonly error: string | null;
  readonly uncertain: boolean;
  readonly onevent: (event: BankEvent) => void;
  readonly onnavigate: (destination: string) => void;
}
