// The device-local state of an action: its answers, current edit, ignored key and execution result.
interface Walking {
  readonly kind: "act";
  readonly tool: string;
  readonly act: string;
  readonly target?: string;
  readonly answers: readonly string[];
  /** What was asked, as it was asked: an act can change what its questions would say now. */
  readonly asked: readonly { readonly ask: string; readonly shown: string }[];
  readonly pos: number;
  /** The first question it asks: what comes before was fixed by the row that started it. */
  readonly floor: number;
  /** Where it stops asking, when it asks only part of what the act takes: the rest it already has. */
  readonly until?: number;
  readonly carried?: true;
  /** Those answers, as they were when it began: what each datum is today, whatever is answered since. */
  readonly was?: readonly string[];
  /** It asks one datum and nothing else. */
  readonly lone?: true;
  readonly typed: string;
  readonly caret: number;
  readonly at: number;
  readonly marks: readonly string[];
  /** How many windows back of what the question says the person is reading, from its options. */
  readonly read?: number;
  readonly reading?: number;
  /** What is written was there when the question opened: the first key written replaces it, any other edits it. */
  readonly suggested: boolean;
  readonly error?: string;
  readonly ignored?: true;
  /** Only a result returned by an action that ran is an Error. */
  readonly failed?: true;
  /** In a question that picks a thing, the person is looking for it: what they type is what they look for. */
  readonly finding?: true;
  /** It was started from a question that picks a thing, to make a new one: what it makes answers that question. */
  readonly returns?: true;
}
export type Asking = Walking & { readonly phase: "asking" };
export type Running = Walking & { readonly phase: "running"; readonly since: number };
export type Done = Walking & { readonly phase: "done"; readonly done: string; readonly doneAt?: string } & {
  /** The thing it made, when it made one. */
  readonly made?: string;
};
export type Walk = Asking | Running | Done;
