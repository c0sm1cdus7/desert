// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
import { fieldTexts } from "./field-texts.ts";
export const genericTexts = {
  optional: " · opcional",
  /** The last list of a thing: everything that was done to it, as the journal has it. */
  record: { title: "Registro" },
  ...fieldTexts,
  /** What a row says of an act that cannot be undone, when the act has nothing more useful to say there. */
  irreversible: "irreversible",
  /** What a person may prefer not to see, and the two answers each one takes. */
  preferences: {
    name: "Preferencias",
    key: ",",
    listed: "Preferencias",
    save: "guardar",
    show: { title: "Mostrar", key: "m" },
    hide: { title: "Ocultar", key: "o" },
    shown: "se muestran",
    hidden: "no se muestran",
    /** What changing one answers, as any act does: what was done, to what, and how it is now. */
    now: (name: string, how: string) => `Cambiado · ${name} · ${how}`,
    off: { name: "acciones apagadas", key: "a" },
    foreign: { name: "herramientas ajenas", key: "h" },
    empty: { name: "listas vacías", key: "l" },
  },
} as const;
