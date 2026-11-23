// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
import { fieldTexts } from "./field-texts.ts";
export const genericTexts = {
  optional: { en: " · optional", es: " · opcional" },
  record: { title: { en: "Record", es: "Registro" } },
  ...fieldTexts,
  irreversible: { en: "irreversible", es: "irreversible" },
  preferences: {
    name: { en: "Preferences", es: "Preferencias" },
    key: ",",
    listed: { en: "Preferences", es: "Preferencias" },
    save: { en: "save", es: "guardar" },
    show: { title: { en: "Show", es: "Mostrar" }, key: "m" },
    hide: { title: { en: "Hide", es: "Ocultar" }, key: "o" },
    shown: { en: "shown", es: "se muestran" },
    hidden: { en: "not shown", es: "no se muestran" },
    now: (name: string, how: string) => ({ en: `Changed · ${name} · ${how}`, es: `Cambiado · ${name} · ${how}` }),
    off: { name: { en: "actions turned off", es: "acciones apagadas" }, key: "a" },
    foreign: { name: { en: "foreign tools", es: "herramientas ajenas" }, key: "h" },
    empty: { name: { en: "empty lists", es: "listas vacías" }, key: "l" },
    language: { name: { en: "language", es: "idioma" }, key: "i" },
  },
} as const;
