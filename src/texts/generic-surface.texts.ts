// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
import { fieldTexts } from "./field-texts.ts";
export const genericTexts = {
  optional: " · opcional",
  record: { title: "Registro" },
  ...fieldTexts,
  irreversible: "irreversible",
  preferences: {
    name: "Preferencias",
    key: ",",
    listed: "Preferencias",
    save: "guardar",
    show: { title: "Mostrar", key: "m" },
    hide: { title: "Ocultar", key: "o" },
    shown: "se muestran",
    hidden: "no se muestran",
    now: (name: string, how: string) => `Cambiado · ${name} · ${how}`,
    off: { name: "acciones apagadas", key: "a" },
    foreign: { name: "herramientas ajenas", key: "h" },
    empty: { name: "listas vacías", key: "l" },
    language: { name: "idioma", key: "i" },
  },
} as const;
