/** Cases N01–N32 from the fifth adversarial review; source text is never executed. */
export const selectionCases: Readonly<Record<string, string>> = {
  N01_keys_map: "export function leer(x: Record<string, number>) { return Object.keys(x).map(k => x[k]); }",
  N02_keys_interfaz_cast:
    "interface F { a: number; b: number } export function leer(x: F) { return (Object.keys(x) " +
    "as (keyof F)[]).map(k => x[k]); }",
  N03_matriz: "export function leer(m: number[][], i: number, j: number) { return m[i]?.[j]; }",
  N04_at: "export function leer(l: readonly string[], i: number) { return l.at(i); }",
  N05_arreglo_de_Date: "export function leer(fechas: readonly Date[], i: number) { return fechas[i]?.getTime(); }",
  N06_registro_de_Date: "export function leer(f: Record<string, Date>, k: string) { return f[k]?.toISOString(); }",
  N07_registro_de_Map:
    "export function leer(f: Record<string, ReadonlyMap<string, number>>, k: string) { return " + "f[k]?.get('a'); }",
  N08_registro_de_Set:
    "export function leer(f: Record<string, ReadonlySet<string>>, k: string) { return " + "f[k]?.has('a'); }",
  N09_arreglo_de_clase:
    "class Item { constructor(readonly id: string) {} } export function leer(items: readonly " +
    "Item[], i: number) { return items[i]?.id; }",
  N10_arreglo_con_metodo:
    "type Fila = { id: string; etiqueta(): string }; export function leer(filas: readonly " +
    "Fila[], i: number) { return filas[i]?.id; }",
  N11_generico_libre: "export function enesimo<T>(xs: readonly T[], i: number): T | undefined { return xs[i]; }",
  N12_generico_object:
    "export function valor<T extends object, K extends keyof T>(o: T, k: K): T[K] { return " + "o[k]; }",
  N13_json_validado_unknown:
    "export function leer(texto: string, k: string) { const d: unknown = JSON.parse(texto); if " +
    "(typeof d !== 'object' || d === null) return undefined; const r: Record<string, unknown> " +
    "= { ...d }; return r[k]; }",
  N14_cache_promesas:
    "const cache: Record<string, Promise<number>> = {}; export function leer(k: string) { " +
    "return cache[k] ?? (cache[k] = Promise.resolve(1)); }",
  N15_arreglo_RegExp:
    "const patrones: readonly RegExp[] = [/a/]; export function leer(i: number, t: string) { " +
    "return patrones[i]?.test(t); }",
  N16_enumerado_as_const:
    "const Estado = { A: 'alta', B: 'baja' } as const; export function leer(e: keyof typeof " +
    "Estado) { return Estado[e]; }",
  N17_errores: "export function leer(errores: readonly Error[], i: number) { return errores[i]?.message; }",
  N18_catalogo_mensajes_fn:
    "const mensajes: Record<string, (n: number) => string> = { a: n => `${n}` }; export " +
    "function leer(k: string) { return mensajes[k]?.(1); }",
  N19_tupla_con_funcion:
    "const pares: readonly (readonly [string, (x: number) => number])[] = []; export function " +
    "leer(i: number) { return pares[i]?.[0]; }",
  N20_bigint_y_opcional: "export function leer(t: Partial<Record<'a' | 'b', bigint>>, k: 'a' | 'b') { return t[k]; }",
  N21_cascada_as_en_auxiliar:
    "function filas(texto: string): { id: string }[] { const crudo: unknown = " +
    "JSON.parse(texto); const lista = Array.isArray(crudo) ? crudo : []; return lista.map(x => " +
    "({ id: String((x as { id: unknown }).id) })); } export function leer(t: string, i: " +
    "number) { return filas(t)[i]; }",
  N22_cascada_as_lejano:
    "function cuenta(t: string) { const n = Number(t) as number; return n; } function lista(t: " +
    "string): number[] { return [cuenta(t)]; } export function leer(t: string, i: number) { " +
    "return lista(t)[i]; }",
  N23_clave_legitima_prototype:
    "const campos = { nombre: 'Nombre', prototype: 'Prototipo' }; export function leer(k: " +
    "keyof typeof campos) { return campos[k]; }",
  N24_buffer: "export function leer(b: Buffer, i: number) { return b[i]; }",
  N25_texto_en_arreglo: "export function leer(t: string, i: number) { return t.split(',')[i]; }",
  N26_record_de_records:
    "export function leer(t: Record<string, Record<string, number>>, a: string, b: string) { " + "return t[a]?.[b]; }",
  N27_entries_index: "export function leer(t: Record<string, number>, i: number) { return Object.entries(t)[i]; " + "}",
  N28_desestructurar_computado:
    "export function leer(t: Record<string, number>, k: string) { const { [k]: v } = t; return " + "v; }",
  N29_union_arreglo_registro:
    "export function leer(t: readonly number[] | Record<number, number>, i: number) { return " + "t[i]; }",
  N31_cadena_opcional:
    "export function leer(v: { xs: readonly number[] } | undefined, i: number) { return " + "v?.xs[i]; }",
  N32_objeto_mixto_clave_de_texto:
    "const dicho = { oficial: 'Oficial', propia: 'Propia', fila: (n: number) => `${n}` }; " +
    "export function leer(k: 'oficial' | 'propia') { return dicho[k]; }",
  N30_generico_extends_record:
    "export function leer<T extends Record<string, number>>(t: T, k: string) { return t[k]; }",
};
