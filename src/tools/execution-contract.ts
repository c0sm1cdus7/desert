// Internal engine capabilities never cross Tool.start or an action context.
import type { DeviceDispatch } from "./execution/device-execution.ts";
import type { ContractFactory } from "./contract-port.ts";
import type { TSchema } from "@sinclair/typebox";
import type { Bus } from "../journal/bus.ts";
import type { Program, State, ToolRegistry, OwnAct } from "./tool-contract.ts";
import type { CapabilityFactory, CapabilityLease } from "./execution/execution-capabilities.ts";
import type { RunningAct } from "./execution/running-acts.ts";
import type { MindScope } from "./minds/mind-contract.ts";
import type { ActVerdict, ReviewPort } from "./minds/mind-review.ts";
/** Why a marked act gets no verdict, besides a house with no supervisor: its minds have not started, or it is a
 * reaction, which never waits for one. */
type Unjudged = "starting" | "reaction";
export type Execution<X extends Program> = Readonly<{ bus: Bus<X["fact"]>; now: () => number }> &
  Readonly<{ registry: ToolRegistry<X>; state: () => State<X>; own: (state: State<X>) => readonly OwnAct<X>[] }> &
  Readonly<{ process: (id: string, by?: string) => boolean; live: () => boolean; chain?: readonly string[] }> &
  Readonly<{
    authorization?: AbortSignal;
    contracts?: ContractFactory;
    devices?: DeviceDispatch;
    mindScope?: MindScope;
    review?: ReviewPort;
    /** A marked act gets a verdict instead of waiting: a mind's in its turn through `review`, anyone else's from
     * `supervisor`. `execute` sets it for each act; a marked act with no verdict is not done and says why. */
    judge?: boolean | Unjudged;
    /** The house supervisor while one runs, or `starting` until the minds that bring it start (21/11). */
    supervisor?: () => ActVerdict | "starting" | undefined;
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
