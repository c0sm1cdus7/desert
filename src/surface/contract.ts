// The one surface contract: what every renderer draws, and what it sends back. Keys and cells are not here.
import type { Tone } from "./tones.ts";

export interface Span {
  readonly text: string;
  readonly tone: Tone;
  readonly bold?: boolean;
  /** Real color, for what is not UI: a photo's pixels, a page's own colors. */
  readonly rgb?: { readonly fg?: string; readonly bg?: string };
}
export type HintKey = "move" | "confirm" | "cancel" | "mark" | "switch" | "full";
export interface Hint {
  readonly intent: HintKey;
  readonly does: string;
}
export type Intent =
  | {
      readonly kind: "up" | "down" | "left" | "right" | "confirm" | "cancel" | "erase" | "menu" | "quit" | "switch";
    }
  | { readonly kind: "type"; readonly text: string };
export interface Row {
  readonly key?: string;
  readonly title: string;
  readonly detail?: string;
  readonly tone?: Tone;
  readonly selected?: boolean;
  /** It opens nothing: a label and its value, which the value leads. */
  readonly still?: boolean;
  /** It cannot be chosen now: it stays where it is, and its detail says why. */
  readonly off?: boolean;
  readonly entry?: { readonly typed: string; readonly caret: number };
  /** One line drawn as it is: a line of a block, of a chart, of a page. */
  readonly spans?: readonly Span[];
}
export interface Stack {
  readonly title: string;
  readonly empty?: string;
  readonly rows: readonly Row[];
  readonly above?: number;
  readonly below?: number;
}
export interface Attachment {
  readonly title: string;
  readonly detail: string;
  readonly selected?: boolean;
}
export interface ThreadEvent {
  readonly head?: readonly Span[];
  readonly quote?: string;
  readonly text: readonly Span[];
  readonly attachments?: readonly Attachment[];
  readonly selected?: boolean;
  readonly nested?: boolean;
  readonly muted?: boolean;
}
export type Theme = "dark" | "light" | "contrast";
export type Body =
  | { readonly kind: "list"; readonly stacks: readonly Stack[] }
  | { readonly kind: "focus"; readonly title: string; readonly lines: readonly (readonly Span[])[] }
  | {
      readonly kind: "thread";
      readonly events: readonly ThreadEvent[];
      readonly options?: readonly Row[];
      readonly entry?: { readonly typed: string; readonly caret: number; readonly placeholder: string };
      readonly reference?: string;
    };
export interface Panel {
  readonly title: string;
  readonly detail?: string;
  readonly lines: readonly (readonly Span[])[];
  readonly focused: boolean;
  readonly full: boolean;
  readonly top: number;
}
export interface Screen {
  readonly title: string;
  readonly state: "connected" | "connecting" | "signal-lost" | "disconnected";
  readonly clock: string;
  readonly battery?: string;
  readonly body: Body;
  readonly panel?: Panel;
  readonly hints: readonly Hint[];
  readonly menu: boolean;
}
export interface Option {
  readonly key?: string;
  readonly title: string;
  readonly detail?: string;
}
interface Question {
  readonly ask: string;
  readonly initial?: string;
  readonly valid?: (value: string) => boolean;
}
/** What a field with a format takes and shows: only the keys that fit it, and its shape before anything is typed. */
export interface Mask {
  readonly empty: string;
  /** What is typed after one more key; the same as before when the key does not fit. */
  put(typed: string, text: string): string;
  shown(typed: string): string;
}
/** What it can be answered with is part of its kind: choosing among nothing does not type. */
export type Field = Question &
  /** A written field says what it expects: its mask, or a placeholder in the program's words. Never neither. */
  (
    | { readonly kind: "text"; readonly placeholder: string }
    | { readonly kind: "text"; readonly mask: Mask }
    | { readonly kind: "secret" }
    | { readonly kind: "one" | "many"; readonly options: readonly Option[] }
    | { readonly kind: "confirm"; readonly options: readonly Option[]; readonly reversible?: boolean }
  );
export type Result = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly reason: string };
interface ActOn<Destination extends readonly string[]> {
  readonly label: string;
  /** What enter says on its last question. */
  readonly verb: string;
  readonly key?: string;
  readonly hint?: string;
  readonly title?: (...on: Destination) => string;
  /** Why it cannot be done here and now, when that is so: it stays on the list, off, and says this. */
  readonly off?: (...on: Destination) => string | undefined;
  /** Whether it is on the list at all: not every act is for everything, and a person may prefer not to see some. */
  readonly listed?: (...on: Destination) => boolean;
  readonly next: (answers: readonly string[], ...on: Destination) => Field | null;
  readonly run: (answers: readonly string[], ...on: Destination) => Promise<Result>;
}
/** On the tool itself: it has no destination to get wrong. "row" is reached only from the row that names it. */
export interface ToolAct extends ActOn<[]> {
  readonly scope: "all" | "row";
}
/** On one thing: its destination is required, and it says whether the thing survives it. */
export interface ThingAct extends ActOn<[target: string]> {
  readonly scope: "each" | "row";
  readonly leaves: boolean;
}
export interface Said {
  readonly id: string;
  readonly who?: readonly Span[];
  readonly quote?: string;
  readonly text: string | readonly Span[];
  readonly nested?: boolean;
  readonly attachments?: readonly (Attachment & { readonly id: string })[];
  /** What enter does on it with nothing typed: an act on it, of the tool that has it, and the word that says so. */
  readonly act?: { readonly tool: string; readonly name: string; readonly does: string };
}
export interface Conversation {
  said(): readonly Said[];
  live(): readonly Span[] | null;
  /** Resolves with the refusal, if any: what is typed leaves the Entrada only once the house accepted it. */
  send(text: string, quote?: string, answers?: string): Promise<string | undefined>;
  pending?(): { readonly id: string; readonly options: readonly Option[] } | null;
  /** Asks for what came before the oldest message shown; it arrives on its own. */
  older?(): void;
  open(attachment: string): Omit<Panel, "focused" | "full" | "top">;
}
export type ViewRow = Row & { readonly opens?: string; readonly act?: string } & {
  /** A control in its line: it takes enter, typing and erasing where it stands, like a field or a choice. */
  readonly press?: (key: Intent) => void;
  /** Where its act runs, when not on what the view shows: an entry listed in it, by the tool that acts on it. */
  readonly on?: { readonly tool: string; readonly target: string };
};
export interface Tool {
  rendered?(target?: string): void;
  /** Why it cannot be opened, when that is so: a tool nobody gave you stays on your Menu, off, and says this. */
  off?(): string | undefined;
  /** Whether it is on the Menu at all: a person may prefer not to see what is not theirs. */
  listed?(): boolean;
  /** It asked for your attention, and you have not attended it yet. */
  calls?(): boolean;
  readonly id: string;
  readonly name: string;
  readonly place: { readonly key: string; readonly section: "tools" | "system" | "hidden" };
  summary(): string;
  /** What the Barra says on one of its things. */
  titleOf?(target: string): string;
  /** A target it does not list is a defect: it throws, and never answers with another screen. */
  view(target?: string): readonly (Omit<Stack, "rows"> & { readonly rows: readonly ViewRow[] })[];
  readonly acts: Readonly<Record<string, ToolAct>>;
  readonly actsOn?: Readonly<Record<string, ThingAct>>;
  readonly conversation?: Conversation;
  readonly conversationAt?: (target: string) => Conversation | undefined;
}
