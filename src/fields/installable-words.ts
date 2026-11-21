// Declares program and group words without depending on the surface layer.
export type StackWords = Readonly<{ title: string; empty: string; reads: Readonly<Record<string, string>> }>;
/** A tool that says `inside` lives in that other tool of its own program: it has no row among the tools the program
 * lists, its things are opened from what names them, and it has no act on the tool. */
export type ProgramWords = Readonly<{ name: string; key: string; inside?: string }> &
  (
    | Readonly<{ itself: readonly StackWords[] }>
    | Readonly<{
        empty: string;
        listed: string;
        reads: Readonly<Record<string, string>>;
        presents: readonly StackWords[];
      }>
  );
