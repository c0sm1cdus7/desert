// Declares program and group words without depending on the surface layer: each word in every language.
import type { Text } from "./phrases.ts";
export type StackWords = Readonly<{ title: Text; empty: Text; reads: Readonly<Record<string, Text>> }>;
export type ProgramWords = Readonly<{ name: Text; key: string }> &
  (
    | Readonly<{ itself: readonly StackWords[] }>
    | Readonly<{
        empty: Text;
        listed: Text;
        reads: Readonly<Record<string, Text>>;
        presents: readonly StackWords[];
      }>
  );
