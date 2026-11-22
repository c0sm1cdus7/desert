// The closed pieces of the approved form: what every painter draws, already decided, and nothing else.
import type { HintKey, Intent, Keypad, Screen, Span } from "../contract/contract.ts";
import type { Tone } from "../contract/tones.ts";
/** A run of spans whose tones the bank already chose: a painter only gives each token its value. */
export type Text = readonly Span[];

/** Latido: the one point that says the connection (REGLAS §4, §8). */
export interface BeatPiece {
  readonly kind: "beat";
  readonly state: Screen["state"];
  readonly icon: "●" | "×";
  readonly tone: Tone;
}
/** Barra: what you are seeing, and live states. No words of its own (REGLAS §4). */
export interface BarPiece {
  readonly kind: "bar";
  readonly title: Span;
  readonly beat: BeatPiece;
  readonly clock: Span;
  readonly battery?: Span;
}
/** Acción: one control. `does` is the only word drawn for it; `key` is the name of its key, for who has keys. */
export interface ActionPiece {
  readonly kind: "action";
  readonly control: HintKey | "menu" | "quit";
  readonly key: Span;
  readonly does: Span;
  readonly sends: Intent | "move";
}
/** Toolbar: one rail. `fixed` is the same on every screen; `aids` are the hints of this one, in order (REGLAS §5). */
export interface ToolbarPiece {
  readonly kind: "toolbar";
  readonly fixed: readonly ActionPiece[];
  readonly aids: readonly ActionPiece[];
}
/** Aviso: one quiet line the surface itself says. */
export interface NoticePiece {
  readonly kind: "notice";
  readonly about: "above" | "below" | "empty" | "reference" | "small";
  readonly text: Span;
}
/** Entrada: where one writes (REGLAS §8, §9b2bis «Input»). */
export interface EntryPiece {
  readonly kind: "entry";
  /** The name of what is written, in a row that has one. */
  readonly label?: Span;
  /** What is shown where one writes, in order: what is written, then the part of its shape still to fill. */
  readonly written: Text;
  /** What it says while nothing is written. */
  readonly placeholder?: Span;
  /** What is written was there when it opened: it is lit whole, and a key replaces it. Then there is no caret. */
  readonly whole: boolean;
  /** Where the caret stands, in code points of what is written, and the character it stands on. */
  readonly caret?: { readonly at: number; readonly under: Span };
  /** The keys it asks for: a written question's own, or text. The bank says it once, for every painter. */
  readonly keyboard: Keypad;
  /** What is written is a secret: it is shown covered, and no painter keeps, completes or suggests it. */
  readonly secret: boolean;
}
/** Fila: a datum or a choice (REGLAS §8). */
export type RowPiece =
  | { readonly kind: "row"; readonly as: "line"; readonly line: Text }
  | { readonly kind: "row"; readonly as: "entry"; readonly entry: EntryPiece }
  | {
      readonly kind: "row";
      readonly as: "text";
      readonly key?: Span;
      readonly name: Span;
      readonly datum?: Span;
      /** Which of the two is kept whole when both do not fit. */
      readonly whole: "name" | "datum";
      readonly chosen: boolean;
      readonly off: boolean;
      readonly still: boolean;
      /** What pointing at it sends: present iff the row can be chosen now, and then it names the row. */
      readonly sends?: { readonly kind: "choose"; readonly row: string };
      /** In a question that takes several: whether this one is taken. `key` still says it to who has keys. */
      readonly marked?: boolean;
    };
/** Pila: a titled stack of rows (REGLAS §9 «Lista»). */
export interface StackPiece {
  readonly kind: "stack";
  readonly title: Span;
  readonly keyed: boolean;
  readonly above?: NoticePiece;
  readonly empty?: NoticePiece;
  readonly rows: readonly RowPiece[];
  readonly below?: NoticePiece;
}
/** Lista: the stacks of a menu or of a thing, in order. */
export interface ListPiece {
  readonly kind: "list";
  readonly stacks: readonly StackPiece[];
}
/** Pregunta: the options of a question, where the Entrada would be (REGLAS §7 :118, §9 :162-165). */
export interface OptionsPiece {
  readonly kind: "options";
  readonly keyed: boolean;
  readonly above?: NoticePiece;
  readonly rows: readonly RowPiece[];
  readonly below?: NoticePiece;
}
/** Evento: who, text, and what it carries (REGLAS §7, §8). */
export interface EventPiece {
  readonly kind: "event";
  readonly head?: Text;
  readonly quote?: Span;
  readonly text: Text;
  readonly attached: readonly { readonly line: Text; readonly lit: boolean }[];
  readonly lit: boolean;
  readonly indent: boolean;
  readonly nested: boolean;
}
/** Hilo: events, the last one below (REGLAS §9). */
export interface ThreadPiece {
  readonly kind: "thread";
  readonly events: readonly EventPiece[];
  readonly read: number;
  readonly options?: OptionsPiece;
  readonly reference?: NoticePiece;
  readonly entry?: EntryPiece;
}
/** Foco: one thing in the middle (REGLAS §9). */
export interface FocusPiece {
  readonly kind: "focus";
  readonly title: Span;
  readonly lines: readonly Text[];
}
/** Celdas: what opened beside what opened it (REGLAS §9, §9b). */
export interface PanelPiece {
  readonly kind: "panel";
  readonly title: Span;
  readonly detail: Span;
  readonly lines: readonly Text[];
  readonly focused: boolean;
  readonly full: boolean;
  readonly top: number;
}
export type ContentPiece = ListPiece | ThreadPiece | FocusPiece;
/** The three zones, in the order they never leave (REGLAS §3): the order is the type. */
export interface SurfacePiece {
  readonly kind: "surface";
  readonly zones: readonly [BarPiece, { readonly main: ContentPiece; readonly beside?: PanelPiece }, ToolbarPiece];
  /** What a painter shows alone when it has less room than its own minimum (REGLAS §14). */
  readonly small: NoticePiece;
}
export type Piece =
  | SurfacePiece
  | BarPiece
  | BeatPiece
  | ToolbarPiece
  | ActionPiece
  | NoticePiece
  | EntryPiece
  | RowPiece
  | StackPiece
  | ListPiece
  | OptionsPiece
  | EventPiece
  | ThreadPiece
  | FocusPiece
  | PanelPiece;
/** Every kind of piece there is: a sixteenth is a conversation with the owner first. */
export const pieceKinds = [
  "surface",
  "bar",
  "beat",
  "toolbar",
  "action",
  "notice",
  "entry",
  "row",
  "stack",
  "list",
  "options",
  "event",
  "thread",
  "focus",
  "panel",
] as const satisfies readonly Piece["kind"][];
