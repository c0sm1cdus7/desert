// Declares program and group words without depending on the surface layer.
export type StackWords = Readonly<{ title: string; empty: string; reads: Readonly<Record<string, string>> }>;
export type ProgramWords = Readonly<{ name: string; key: string }> &
  (
    | Readonly<{ itself: readonly StackWords[] }>
    | Readonly<{
        empty: string;
        listed: string;
        reads: Readonly<Record<string, string>>;
        presents: readonly StackWords[];
      }>
  );
