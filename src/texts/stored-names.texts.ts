// What the stored-name migration says to whoever runs it, before, after and when it refuses.
export const storedNamesTexts = {
  usage: {
    en:
      "Usage: pnpm migrate-names --backup <folder> [--journal <journal.sqlite>] [--account <account.sqlite>]\n" +
      "Copies each file into the folder, renames what is stored in Spanish, gives Spanish to each identity " +
      "without a language and checks the result.",
    es:
      "Uso: pnpm migrate-names --backup <carpeta> [--journal <journal.sqlite>] [--account <cuenta.sqlite>]\n" +
      "Hace una copia de cada archivo en la carpeta, renombra lo guardado en castellano, da el castellano a cada " +
      "identidad sin idioma y comprueba el resultado.",
  },
  backupRequired: {
    en: "The backup folder is missing: --backup takes a folder that exists. Nothing was touched.",
    es: "Falta la carpeta de copia: pasá --backup con una carpeta que exista. No se tocó nada.",
  },
  backupExists: (file: string) => ({
    en: `There is already a copy at ${file}: another folder is needed. Nothing was touched.`,
    es: `Ya hay una copia en ${file}: elegí otra carpeta. No se tocó nada.`,
  }),
  notJournal: {
    en: "The file is not a DESERT journal: it lacks the append-only protection.",
    es: "El archivo no es un diario de DESERT: no tiene la protección de solo agregar.",
  },
  namesLeft: {
    en: "Old names remain after migrating; the change was undone.",
    es: "Después de migrar todavía quedan nombres viejos; se deshizo el cambio.",
  },
  languagesLeft: {
    en: "Identities without a language remain after migrating; the change was undone.",
    es: "Después de migrar todavía quedan identidades sin idioma; se deshizo el cambio.",
  },
  foldChanged: {
    en: "The folded state after migrating differs from the one before; the change was undone.",
    es: "El estado plegado después de migrar no es igual al de antes; se deshizo el cambio.",
  },
  migrated: (file: string, changed: number, rows: number, spoken: number, backup: string | undefined) =>
    backup
      ? {
          en:
            `${file}: ${changed} of ${rows} facts renamed; ${spoken} identities without a language receive ` +
            `Spanish; copy at ${backup}. Checked.`,
          es:
            `${file}: ${changed} de ${rows} hechos renombrados; ${spoken} identidades sin idioma reciben el ` +
            `castellano; copia en ${backup}. Comprobado.`,
        }
      : {
          en: `${file}: nothing to rename and no identities without a language in ${rows} facts. Checked.`,
          es: `${file}: nada que renombrar ni identidades sin idioma en ${rows} hechos. Comprobado.`,
        },
  failed: (file: string, reason: string) => ({
    en: `${file}: not migrated. ${reason}`,
    es: `${file}: no se migró. ${reason}`,
  }),
  unmigrated: (identities: readonly string[]) => ({
    en:
      `Identities without a language: ${identities.join(", ")}. This journal is from before 23/11: it migrates ` +
      "with pnpm migrate-names --backup <folder> --journal <journal.sqlite>.",
    es:
      `Identidades sin idioma: ${identities.join(", ")}. Este diario es de antes del 23/11: migralo con ` +
      "pnpm migrate-names --backup <carpeta> --journal <journal.sqlite>.",
  }),
};
