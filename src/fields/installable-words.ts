// Declares program and group words without depending on the surface layer.
export type StackWords = Readonly<{ title: string; empty: string; reads: Readonly<Record<string, string>> }>;
/** A tool that says `inside` lives in that other tool of its own program: it has no row among the tools the program
 * lists, and it is opened from what names its things. */
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
