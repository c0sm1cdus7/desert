// The name of each control's key, for who has keys, and the two controls every screen has.
import type { Language } from "../../fields/languages.ts";
import { wordsIn } from "../../fields/phrases.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import type { HintKey } from "../contract/contract.ts";
import type { ActionPiece } from "./pieces.ts";

/** A hint with no name in the catalog does not compile: the name of each key, as its reader reads it. */
export const controlNames = (language: Language): Readonly<Record<HintKey, string>> =>
  wordsIn(surfaceTexts, language).controls;
/** Menu, only where the screen offers it, and then always «Salir». */
export const fixedControls = (menu: boolean, language: Language): readonly ActionPiece[] => {
  const said = wordsIn(surfaceTexts, language);
  return [
    ...(menu
      ? [
          {
            kind: "action",
            control: "menu",
            key: { text: said.chords.menu, tone: "t2" },
            does: { text: said.keys.menu, tone: "t3" },
            sends: { kind: "menu" },
          } as const,
        ]
      : []),
    {
      kind: "action",
      control: "quit",
      key: { text: said.chords.quit, tone: "t2" },
      does: { text: said.keys.quit, tone: "t3" },
      sends: { kind: "quit" },
    },
  ];
};
