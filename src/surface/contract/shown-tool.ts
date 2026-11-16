import type { Attachment, Field, Intent, Option, Panel, Row, Span, Stack } from "./contract.ts";
// What a tool gives a surface: its acts and menus, its rows, its conversations, and what it tells from any menu.
export { MissingView } from "./missing-view.ts";

export type Result =
  /** What it said and, when it made a thing, which one. */
  | { readonly ok: true; readonly text: string; readonly made?: string }
  | { readonly ok: false; readonly reason: string };
interface ActOn<Destination extends readonly string[]> {
  readonly label: string;
  /** What enter says on its last question. */
  readonly verb: string;
  readonly key?: string;
  /** What its row says to the right: something of use about what it would do now. Never what it is for. */
  readonly datum?: (...on: Destination) => string | undefined;
  readonly title?: (...on: Destination) => string;
  /** Why it cannot be done here and now, when that is so: it stays on the list, off, and says this. */
  readonly off?: (...on: Destination) => string | undefined;
  /** Whether it is on the list at all: not every act is for everything, and a person may prefer not to see some. */
  readonly listed?: (...on: Destination) => boolean;
  /** Current answers, read when a walk begins through any entry. */
  /** Compares complete answers in the declared data shape, including normalized text and numbers. */
  readonly same?: (answers: readonly string[], current: readonly string[]) => boolean;
  readonly today?: (...on: Destination) => readonly string[] | undefined;
  readonly next: (answers: readonly string[], ...on: Destination) => Field | null;
  /** Why what was answered so far cannot go on, when that is so: said at the question that was just answered. */
  readonly stops?: (answers: readonly string[], ...on: Destination) => string | undefined;
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
  readonly on?: { readonly tool: string; readonly target?: string };
  /** The answers its act starts with: what the thing has today. It asks them from one on, up to another when it
   * asks only part; what comes before is fixed by where the row stands. */
  readonly with?: { readonly answers: readonly string[]; readonly from: number; readonly until?: number } & {
    /** Those answers are what the thing is today, not a suggestion for something new: each question says so. */
    /** Compares complete answers in the declared data shape, including normalized text and numbers. */
    readonly same?: (answers: readonly string[], current: readonly string[]) => boolean;
    readonly today?: true;
  };
};
/** Something a person should know of from a menu: what it is about, what is said of it, and where it leads. */
export interface Notice {
  readonly title: string;
  readonly detail: string;
  /** The thing of the tool it leads to; the tool itself when it names none. */
  readonly opens?: string;
}
/** An option among a thing's actions that opens another list instead of asking: a menu that leads to a menu. */
export interface ThingMenu {
  readonly label: string;
  readonly key: string;
  /** What it is for: what its row says to its right, which is never empty. */
  readonly purpose: string;
  readonly listed?: (target: string) => boolean;
  /** Why nothing under it can be done now, when that is so: it stays on the list, off, and says this. */
  readonly off?: (target: string) => string | undefined;
  /** Where it leads: a destination its tool's view answers. */
  readonly opens: (target: string) => string;
}
export interface Tool {
  rendered?(target?: string): void;
  /** Why it cannot be opened, when that is so: a tool nobody gave you stays on your Menu, off, and says this. */
  off?(): string | undefined;
  /** Whether it is on the Menu at all: a person may prefer not to see what is not theirs. */
  listed?(): boolean;
  /** It asked for your attention, and you have not attended it yet. */
  calls?(): boolean;
  /** What every menu opens with: what of the tool needs someone to act, and what the others did since you looked.
   * `quiet` when this person prefers not to see those lists while they have nothing. */
  notices?(): { readonly needs: readonly Notice[]; readonly news: readonly Notice[]; readonly quiet: boolean };
  readonly id: string;
  readonly name: string;
  /** Where it is opened from: a section of the Menu, or the tool it lives in, which lists it among its own. */
  readonly place: { readonly key: string; readonly section: "tools" | "system" | "hidden"; readonly inside?: string };
  summary(): string;
  /** What the Barra says on one of its things. */
  titleOf?(target: string): string;
  /** Whether a destination is its own: one of its things, or a place its view answers. A row of any tool that
   * names it leads there. Nothing when it does not say: it is then taken as a place of whoever names it. */
  has?(target: string): boolean | undefined;
  /** This person prefers not to see what has nothing in it: no list of it is there while it is empty. */
  quiet?(): boolean;
  /** Its things that are what someone looks for, each on a row that leads to it: asked from its own menu, and from
   * the Menu along with every other tool's. A tool that does not say cannot be looked into. */
  find?(sought: string): readonly ViewRow[];
  /** A target it does not list is a defect: it throws, and never answers with another screen. */
  view(target?: string): readonly (Omit<Stack, "rows"> & { readonly rows: readonly ViewRow[] })[];
  readonly acts: Readonly<Record<string, ToolAct>>;
  readonly actsOn?: Readonly<Record<string, ThingAct>>;
  readonly menusOn?: Readonly<Record<string, ThingMenu>>;
  /** The acts of other tools offered among the actions of one of its things: each a row that starts that act with
   * what the thing already says of it. */
  alsoOn?(target: string): readonly ViewRow[];
  readonly conversation?: Conversation;
  readonly conversationAt?: (target: string) => Conversation | undefined;
}
