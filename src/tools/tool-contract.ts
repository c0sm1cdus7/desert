// What a tool is to the house: its acts, what it shows, and what it keeps, whatever program it belongs to.
import type { TSchema } from "@sinclair/typebox";
import type { Act } from "../catalogs/acts.ts";
import type { ViewLimits } from "../catalogs/levers.ts";
import type { HouseView } from "../house/house.ts";
import type { Emission, Event, Foreign, HouseEvent } from "../journal/events.ts";
import type { Execution } from "./execute.ts";
/** What a program brings to a house: its facts, and what each of its tools keeps, under the tool's id. */
export type Program = Readonly<{ fact: Foreign; tools: Record<string, unknown> }>;
export type Entry = HouseEvent<"tool-entry">;
/** What every house keeps, whatever lives in it. */
export type HouseState = HouseView &
  Readonly<{ processing: ReadonlyMap<string, HouseEvent<"act-started">>; through: number }> &
  Readonly<{ acts: ReadonlyMap<string, HouseEvent<"act">> }>;
export type State<X extends Program> = HouseState & Readonly<{ tools: X["tools"] }>;
/** What each tool keeps: where it starts, and how each fact moves it. A tool without a step does not exist. */
export type Slices<X extends Program> = Readonly<{
  initial: X["tools"];
  step: {
    readonly [K in keyof X["tools"]]: (kept: X["tools"][K], event: Event<X["fact"]>, before: State<X>) => X["tools"][K];
  };
}>;
/** A house's service credentials: only this store sees their values. */
export interface KeyStore {
  hosts?(provider: string): Promise<readonly string[]>;
  get(provider: string): Promise<string | undefined>;
  set(provider: string, value: string, hosts?: readonly string[]): Promise<void>;
  remove(provider: string): Promise<void>;
}
type Effects<X extends Program> = Readonly<{ effects?: readonly Emission<X["fact"]>[] }>;
type Accepted<X extends Program> = Partial<
  Pick<Entry["data"], "text" | "detail" | "target" | "recipient" | "attention" | "silent">
> &
  Effects<X> &
  Readonly<{ status: "accepted"; private?: string }>;
export type ActResult<X extends Program> =
  | Accepted<X>
  | (Effects<X> & Readonly<{ status: "inconclusive" }>)
  | (Effects<X> & Readonly<{ status: "rejected" | "interrupted"; reason: string }>);
/** "world" when the act leaves the house; everything else stays in it. */
export type Reach = "house" | "world";
export type ActContext<X extends Program> = Readonly<{
  state: State<X>;
  by: string;
  through: number;
  target: string;
  at: number;
  keys: KeyStore;
  id?: string;
  execute?: (act: Act) => Promise<ActResult<X>>;
}>;
export interface ToolAct<X extends Program> extends Readonly<{ input: TSchema; reach: Reach }> {
  /** Where it stands, when it says so: on its tool, or on one of its things. The house refuses it anywhere else. */
  readonly on?: "tool" | "thing";
  /** The tool's cause for not offering this act in this state; an act that does not work is not offered. */
  readonly offered?: (state: State<X>, target: string) => string | undefined;
  /** The act returns something to read; only then does its late result call for attention. */
  readonly output?: boolean;
  secretInputs?(input: unknown, state: State<X>): unknown;
  secretInput?(input: unknown): boolean;
  run(input: unknown, context: ActContext<X>): ActResult<X> | Promise<ActResult<X>>;
  reject?(context: ActContext<X>, result: Accepted<X>): string | undefined;
}
export interface Tool<X extends Program> extends Readonly<{ id: string; purpose: string }> {
  start?(ports: Execution<X>): () => void;
  readonly acts: Readonly<Record<string, ToolAct<X>>>;
  targets(state: State<X>): readonly string[];
  view(state: State<X>, target: string, limits: ViewLimits): string;
  viewData?(state: State<X>, target: string): unknown;
  summary(state: State<X>): string;
  effects?(state: State<X>, event: Event<X["fact"]>): readonly Emission<X["fact"]>[];
  draft?(state: State<X>, through: number, input: unknown, target: string): string | undefined;
}
export type ToolRegistry<X extends Program> = readonly Tool<X>[];
/** An act's result is news when it failed or brought output nobody has read. */
export const actNews = (result: Readonly<{ status: string; output?: boolean | undefined }>): boolean =>
  result.status === "rejected" || result.status === "interrupted" || result.output === true;
/** An act the house offers an identity directly, outside any tool. */
export type OwnAct<X extends Program> = ToolAct<X> & Readonly<{ object: string; option: string; purpose: string }>;
