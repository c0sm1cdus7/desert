// The one surface contract: what every renderer draws, and what it sends back. Keys and cells are not here.
import type { Tone } from "./tones.ts";
export interface Span {
  readonly text: string;
  readonly tone: Tone;
  readonly bold?: boolean;
  /** Real color, for what is not UI: a photo's pixels, a page's own colors. */
  readonly rgb?: { readonly fg?: string; readonly bg?: string };
}
export type HintKey = "move" | "confirm" | "cancel" | "mark" | "switch" | "full" | "find";
export interface Hint {
  readonly intent: HintKey;
  readonly does: string;
}
export type Intent =
  | {
      readonly kind: "up" | "down" | "left" | "right" | "confirm" | "cancel" | "erase" | "menu" | "quit" | "switch";
    }
  | { readonly kind: "type"; readonly text: string }
  /** A whole text brought at once: written where something is being written, and never a key. */
  | { readonly kind: "paste"; readonly text: string }
  /** The person pointed at a row: the one with this identity, wherever it is drawn now. */
  | { readonly kind: "choose"; readonly row: string };
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
  /** It is read: what a thing is and has. Its rows lead with their datum, and none of them is an action. */
  readonly reads?: true;
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
  /** An ignored key says why it was ignored; the value already written may still be valid. */
  readonly ignored?: true;
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
      /** How many options are left out above and below the ones that fit. */
      readonly more?: { readonly above: number; readonly below: number };
      readonly entry?: { readonly typed: string; readonly caret: number; readonly placeholder: string } & {
        /** What is written was there when the question opened: it is shown whole, as what a key would replace. */
        readonly suggested?: true;
        /** The unfilled part of a mask, shown after the written part in text 3. */
        readonly remaining?: string;
        /** Leading mask characters not yet written in an incomplete number, shown in text 3. */
        readonly padding?: number;
      };
      readonly reference?: string;
      /** How many windows back of what is said the person is reading: the options stay where they are. */
      readonly read?: number;
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
  /** What it stands for as an answer, when that is not its title. */
  readonly value?: string;
  /** It cannot be chosen: it is what the datum already is, and its detail says so. */
  readonly off?: boolean;
  /** It is no answer yet: choosing it starts the act that makes a new thing, and what it makes is the answer. */
  readonly makes?: { readonly tool: string; readonly act: string };
}
interface Question {
  /** An amount may be reused only while its currency stays the same. */
  readonly currency?: string;
  readonly ask: string;
  readonly initial?: string;
  readonly valid?: (value: string) => boolean;
  /** Why an answer that is complete still does not hold, when that is so: it stays where it was written. */
  readonly wrong?: (value: string, submitted?: boolean) => string | undefined;
  /** What the datum is today, as an answer: a question that changes it says so beside its name. */
  readonly current?: string;
  /** This answer would finish the act leaving all its data unchanged. */
  readonly unchanged?: (answer: string) => boolean;
  /** It is all its act asks: choosing what the datum already is would change nothing, so that option is off. */
  readonly only?: true;
}
/** What a field with a format takes and shows: only the keys that fit it, and its shape before anything is typed. */
export interface Mask {
  readonly empty: string;
  /** What is typed after one more key; the same as before when the key does not fit. */
  put(typed: string, text: string): string;
  /** Why a key is ignored, even when other characters in the same paste fit. */
  rejected?(typed: string, text: string): string | undefined;
  shown(typed: string): string;
  remaining?(typed: string): string;
  padding?(typed: string): number;
}
/** What it can be answered with is part of its kind: choosing among nothing does not type. */
export type Field = Question &
  /** A written field says what it expects: its mask, or a placeholder in the program's words. Never neither. */
  (
    | { readonly kind: "text"; readonly placeholder: string; readonly max?: number; readonly verbatim?: boolean }
    | { readonly kind: "text"; readonly mask: Mask }
    | { readonly kind: "secret" }
    | { readonly kind: "one" | "many"; readonly options: readonly Option[] }
    /** One of the things of a tool, looked for by what the person types: the answer is the thing, shown by its name. */
    | {
        readonly kind: "pick";
        /** The tool whose things it picks among. */
        readonly of: string;
        readonly found: (sought: string) => readonly Option[];
        readonly shown: (answer: string) => string;
        /** What it says where there is nothing to pick among: a question never stands over an empty list. */
        readonly nothing: () => string;
      }
    | ({ readonly kind: "confirm"; readonly options: readonly Option[]; readonly reversible?: boolean } & {
        /** What the act is for, and that it cannot be undone when it cannot: read under what is to be confirmed. */
        readonly note?: string;
      })
  );
