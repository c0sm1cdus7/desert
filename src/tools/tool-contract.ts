// What a tool is to the house: its acts, what it shows, and what it keeps, whatever program it belongs to.
/** How much of a tool's text view a reader takes at once. */
export type ViewLimits = Readonly<{ recentLines: number }> &
  /** The instant of the reading, for what a tool reads by the day: what is due today. */
  Readonly<{ now: number }>;
import type { DeepReadonly } from "../journal/readonly-state.ts";
import type { TSchema } from "@sinclair/typebox";
import type { Act } from "../house/own-acts.ts";
import type { HouseView } from "../house/members.ts";
import type { Emission, Event, Foreign } from "../journal/facts.ts";
import type { HouseEvent } from "../house/facts.ts";
import type { ToolStartup } from "./startup-contract.ts";
import type { ToolCapabilities } from "./capabilities-contract.ts";
/** What a program brings to a house: its facts, and what each of its tools keeps, under the tool's id. */
export type Program = Readonly<{ fact: Foreign; tools: Record<string, unknown> }>;
export type Entry = HouseEvent<"tool-entry">;
/** What every house keeps, whatever lives in it. */
export type HouseState = HouseView &
  Readonly<{ processing: ReadonlyMap<string, HouseEvent<"act-started">>; through: number }> &
  Readonly<{ acts: ReadonlyMap<string, HouseEvent<"act">>; wakeOwners: ReadonlyMap<string, string> }>;
export type State<X extends Program> = HouseState &
  Readonly<{ tools: { readonly [K in keyof X["tools"]]: DeepReadonly<X["tools"][K]> } }>;
/** What each tool keeps: where it starts, and how each fact moves it. A tool without a step does not exist. */
export type Slices<X extends Program> = Readonly<{
  initial: State<X>["tools"];
  step: {
    readonly [K in keyof X["tools"]]: (
      kept: DeepReadonly<X["tools"][K]>,
      event: Event<X["fact"]>,
      before: State<X>,
    ) => DeepReadonly<X["tools"][K]>;
  };
}>;
/** Legacy provider contract, only for explicit adoption; never part of action or startup capabilities. */
export interface KeyStore {
  hosts?(provider: string): Promise<readonly string[]>;
  get(provider: string): Promise<string | undefined>;
  set(provider: string, value: string, hosts?: readonly string[]): Promise<void>;
  remove(provider: string): Promise<void>;
}
type Effects<X extends Program> = Readonly<{
  effects?: readonly Emission<X["fact"]>[];
  cleanupPending?: true;
  anchorPending?: true;
}>;
type Accepted<X extends Program> = Partial<
  Pick<Entry["data"], "text" | "detail" | "target" | "attention" | "silent" | "made" | "diagnostic">
> &
  Effects<X> &
  Readonly<{ status: "accepted"; private?: string }>;
export type ActResult<X extends Program> =
  | Accepted<X>
  | (Effects<X> & Readonly<{ status: "inconclusive" }>)
  | (Effects<X> & Readonly<{ status: "rejected" | "interrupted"; reason: string }>);
/** "world" when the act leaves the house; everything else stays in it. */
export type Reach = "house" | "world";
export type ActContext<X extends Program> = ToolCapabilities &
  Readonly<{
    state: State<X>;
    by: string;
    through: number;
    target: string;
    at: number;
    id?: string;
    signal?: AbortSignal | undefined;
    execute?: (act: Act) => Promise<ActResult<X>>;
  }>;
export interface ToolAct<X extends Program> extends Readonly<{ input: TSchema; reach: Reach }> {
  /** Where it stands, when it says so: on its tool, or on one of its things. The house refuses it anywhere else. */
  readonly on?: "tool" | "thing";
  /** The tool's cause for not offering this act in this state, at this moment; an act that does not work is not
   * offered. What cannot be done today says so on its row. */
  readonly offered?: (state: State<X>, target: string, at: number) => string | undefined;
  /** The act returns something to read; only then does its late result call for attention. */
  readonly output?: boolean;
  secretInput?(input: unknown): boolean;
  run(input: unknown, context: ActContext<X>): ActResult<X> | Promise<ActResult<X>>;
  reject?(context: ActContext<X>, result: Accepted<X>): string | undefined;
}
export interface Tool<X extends Program> extends Readonly<{ id: string; purpose: string }> {
  /** Program fact kinds owned exclusively by this tool; absent means no program facts. */
  readonly facts?: readonly X["fact"]["kind"][];
  start?(ports: ToolStartup<X>): () => void;
  readonly acts: Readonly<Record<string, ToolAct<X>>>;
  targets(state: State<X>): readonly string[];
  view(state: State<X>, target: string, limits: ViewLimits): string;
  viewData?(state: State<X>, target: string): unknown;
  summary(state: State<X>): string;
  effects?(state: State<X>, event: Event<X["fact"]>): readonly Emission<X["fact"]>[];
  draft?(state: State<X>, through: number, input: unknown, target: string, at: number): string | undefined;
}
export type ToolRegistry<X extends Program> = readonly Tool<X>[];
/** An act's result is news when it failed or brought output nobody has read. */
export const actNews = (result: Readonly<{ status: string; output?: boolean | undefined }>): boolean =>
  result.status === "rejected" || result.status === "interrupted" || result.output === true;
/** An act the house offers an identity directly, outside any tool. */
export type OwnAct<X extends Program> = ToolAct<X> & Readonly<{ object: string; option: string; purpose: string }>;
