// What the stored-name migration says to whoever runs it, before, after and when it refuses.
export const storedNamesTexts = {
  usage:
    "Uso: pnpm migrate-names --backup <carpeta> [--journal <journal.sqlite>] [--account <cuenta.sqlite>]\n" +
    "Hace una copia de cada archivo en la carpeta, renombra lo guardado en castellano y comprueba el resultado.",
  backupRequired: "Falta la carpeta de copia: pasá --backup con una carpeta que exista. No se tocó nada.",
  backupExists: (file: string) => `Ya hay una copia en ${file}: elegí otra carpeta. No se tocó nada.`,
  notJournal: "El archivo no es un diario de DESERT: no tiene la protección de solo agregar.",
  namesLeft: "Después de migrar todavía quedan nombres viejos; se deshizo el cambio.",
  foldChanged: "El estado plegado después de migrar no es igual al de antes; se deshizo el cambio.",
  migrated: (file: string, changed: number, rows: number, backup: string | undefined) =>
    backup
      ? `${file}: ${changed} de ${rows} hechos renombrados; copia en ${backup}. Comprobado.`
      : `${file}: nada que renombrar en ${rows} hechos. Comprobado.`,
  failed: (file: string, reason: string) => `${file}: no se migró. ${reason}`,
};
