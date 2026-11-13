import type { Bus } from "../journal/bus.ts";
import type { Program, State } from "./tool-contract.ts";
import type { ToolCapabilities } from "./capabilities-contract.ts";
/** A tool starts with public methods and an explicit event port, not the engine's execution object. */
export type ToolStartup<X extends Program> = ToolCapabilities &
  Readonly<{
    bus: Pick<Bus<X["fact"]>, "on" | "emit" | "together">;
    state(): State<X>;
    now(): number;
    live(): boolean;
  }>;
