// Internal engine capabilities never cross Tool.start or an action context.
import type { TSchema } from "@sinclair/typebox";
import type { Bus } from "../journal/bus.ts";
import type { Program, State, ToolRegistry, OwnAct } from "./tool-contract.ts";
import type { CapabilityFactory, CapabilityLease } from "./execution/capability-lease.ts";
import type { RunningAct } from "./execution/running-acts.ts";
export type Execution<X extends Program> = Readonly<{ bus: Bus<X["fact"]>; now: () => number }> &
  Readonly<{ registry: ToolRegistry<X>; state: () => State<X>; own: (state: State<X>) => readonly OwnAct<X>[] }> &
  Readonly<{ process: (id: string, by?: string) => boolean; live: () => boolean; chain?: readonly string[] }> &
  Readonly<{
    houseOwn?: (act: OwnAct<X>) => boolean;
    capabilities?: CapabilityFactory;
    running?: Map<string, RunningAct>;
    active?: RunningAct;
    credentialEffects?: Pick<CapabilityLease, "apply" | "together" | "capture" | "recognizes">;
    secrets: {
      capture(value: unknown, registry: ToolRegistry<X>, state?: State<X>): void;
      scrub<T>(value: T): T;
      scope?<T>(
        schema: TSchema | undefined,
        input: unknown,
        work: (input: unknown, valid: boolean) => T,
        save?: (value: string) => string,
        nested?: boolean,
      ): T;
    };
  }>;
