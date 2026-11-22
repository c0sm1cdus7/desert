/** Cases N01–N32 from the fifth adversarial review; source text is never executed. */
export const selectionCases: Readonly<Record<string, string>> = {
  N01_keys_map: "export function read(x: Record<string, number>) { return Object.keys(x).map(k => x[k]); }",
  N02_keys_interface_cast:
    "interface F { a: number; b: number } export function read(x: F) { return (Object.keys(x) " +
    "as (keyof F)[]).map(k => x[k]); }",
  N03_matrix: "export function read(m: number[][], i: number, j: number) { return m[i]?.[j]; }",
  N04_at: "export function read(l: readonly string[], i: number) { return l.at(i); }",
  N05_array_of_Date: "export function read(dates: readonly Date[], i: number) { return dates[i]?.getTime(); }",
  N06_record_of_Date: "export function read(f: Record<string, Date>, k: string) { return f[k]?.toISOString(); }",
  N07_record_of_Map:
    "export function read(f: Record<string, ReadonlyMap<string, number>>, k: string) { return " + "f[k]?.get('a'); }",
  N08_record_of_Set:
    "export function read(f: Record<string, ReadonlySet<string>>, k: string) { return " + "f[k]?.has('a'); }",
  N09_array_of_class:
    "class Item { constructor(readonly id: string) {} } export function read(items: readonly " +
    "Item[], i: number) { return items[i]?.id; }",
  N10_array_with_method:
    "type Row = { id: string; label(): string }; export function read(rows: readonly " +
    "Row[], i: number) { return rows[i]?.id; }",
  N11_free_generic: "export function nth<T>(xs: readonly T[], i: number): T | undefined { return xs[i]; }",
  N12_object_generic:
    "export function value<T extends object, K extends keyof T>(o: T, k: K): T[K] { return " + "o[k]; }",
  N13_validated_json_unknown:
    "export function read(text: string, k: string) { const d: unknown = JSON.parse(text); if " +
    "(typeof d !== 'object' || d === null) return undefined; const r: Record<string, unknown> " +
    "= { ...d }; return r[k]; }",
  N14_promise_cache:
    "const cache: Record<string, Promise<number>> = {}; export function read(k: string) { " +
    "return cache[k] ?? (cache[k] = Promise.resolve(1)); }",
  N15_RegExp_array:
    "const patterns: readonly RegExp[] = [/a/]; export function read(i: number, t: string) { " +
    "return patterns[i]?.test(t); }",
  N16_as_const_enum:
    "const State = { A: 'up', B: 'down' } as const; export function read(e: keyof typeof " +
    "State) { return State[e]; }",
  N17_errors: "export function read(errors: readonly Error[], i: number) { return errors[i]?.message; }",
  N18_message_catalog_fn:
    "const messages: Record<string, (n: number) => string> = { a: n => `${n}` }; export " +
    "function read(k: string) { return messages[k]?.(1); }",
  N19_tuple_with_function:
    "const pairs: readonly (readonly [string, (x: number) => number])[] = []; export function " +
    "read(i: number) { return pairs[i]?.[0]; }",
  N20_bigint_and_optional: "export function read(t: Partial<Record<'a' | 'b', bigint>>, k: 'a' | 'b') { return t[k]; }",
  N21_as_cascade_in_helper:
    "function rows(text: string): { id: string }[] { const raw: unknown = " +
    "JSON.parse(text); const list = Array.isArray(raw) ? raw : []; return list.map(x => " +
    "({ id: String((x as { id: unknown }).id) })); } export function read(t: string, i: " +
    "number) { return rows(t)[i]; }",
  N22_distant_as_cascade:
    "function count(t: string) { const n = Number(t) as number; return n; } function list(t: " +
    "string): number[] { return [count(t)]; } export function read(t: string, i: number) { " +
    "return list(t)[i]; }",
  N23_legitimate_prototype_key:
    "const fields = { kind: 'Name', prototype: 'Prototype' }; export function read(k: " +
    "keyof typeof fields) { return fields[k]; }",
  N24_buffer: "export function read(b: Buffer, i: number) { return b[i]; }",
  N25_text_in_array: "export function read(t: string, i: number) { return t.split(',')[i]; }",
  N26_record_de_records:
    "export function read(t: Record<string, Record<string, number>>, a: string, b: string) { " + "return t[a]?.[b]; }",
  N27_entries_index: "export function read(t: Record<string, number>, i: number) { return Object.entries(t)[i]; " + "}",
  N28_computed_destructuring:
    "export function read(t: Record<string, number>, k: string) { const { [k]: v } = t; return " + "v; }",
  N29_array_record_union:
    "export function read(t: readonly number[] | Record<number, number>, i: number) { return " + "t[i]; }",
  N31_optional_chain:
    "export function read(v: { xs: readonly number[] } | undefined, i: number) { return " + "v?.xs[i]; }",
  N32_mixed_object_text_key:
    "const said = { official: 'Official', own: 'Own', row: (n: number) => `${n}` }; " +
    "export function read(k: 'official' | 'own') { return said[k]; }",
  N30_generic_extends_record:
    "export function read<T extends Record<string, number>>(t: T, k: string) { return t[k]; }",
};
