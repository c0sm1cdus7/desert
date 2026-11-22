/** Source fixtures, never executed: ordinary indexed data and neighboring capability escapes. */
export const dataCases: Readonly<Record<string, string>> = {
  genericObject:
    "function read<T extends readonly number[]>(list: T, i: number) { return list[i]; }" + "return read([1], 0);",
  genericText: "function read<T extends string>(text: T, i: number) { return text[i]; } return read('hello', 0);",
  dataIntersection: "function read(list: number[] & { kind: string }, i: number) { return list[i]; }",
  generic:
    "function read<K extends 'a' | 'b'>(table: Record<K, number>, k: K) { return table[k]; }" +
    "return read({ a: 1 }, 'a');",
  finiteRecord:
    "const table: Readonly<Record<'a' | 'b', string>> = { a: 'one', b: 'two' };" +
    "const k: keyof typeof table = 'a'; return table[k];",
  empty: "const list: never[] = []; const i: number = 0; return list[i];",
  optional:
    "function read(table?: Record<string, number>) { const k: string = 'a'; return table?.[k]; } return read();",
  arrayReadonly: "const list: readonly number[] = [1]; const i: number = 0; return list[i];",
  list: "const list: number[] = [1]; const i: number = 0; return list[i];",
  tuple: "const tuple: [string, number] = ['a', 1]; const n: number = 0; return tuple[n];",
  text: "const text = 'hello'; const i: number = 0; return text[i];",
  table:
    "const table: Record<string, { value: number }> = { a: { value: 1 } };" +
    "const code: string = 'a'; return table[code];",
  byId:
    "const byId: { [id: string]: { kind: string; active?: boolean } } = {};" +
    "const id: string = 'a'; return byId[id];",
  finite: "const table = { a: 1, b: 'two' }; const code: keyof typeof table = 'a'; return table[code];",
  readonly: "const list = [{ value: 1 }] as const; const i: number = 0; return list[i];",
  union: "const table: Record<string, number | null | undefined> = {}; const k: string = ''; return table[k];",
  recursive:
    "interface Datum { children: Datum[]; value: string }" +
    "const table: Record<string, Datum> = {}; const k: string = ''; return table[k];",
  satisfies: "const table = { a: 1 } satisfies Record<string, number>; const k = 'a'; return table[k];",
  publicText:
    "const table = { a: 'constructor', b: '__proto__', c: 'prototype' };" +
    "const k: keyof typeof table = 'a'; return table[k];",
};
/** Deliberate changes in step 7b: only the chosen value matters. */
export const admittedRevisedCases: Readonly<Record<string, string>> = {
  mixedIndex:
    "function read(table: { [k: string]: number | (() => void); a: number }) {" + "const k = 'a'; return table[k]; }",
  intersection: "function read(target: number[] & { run: () => void }, key: number) { return target[key]; }",
  classInstance: "class Datum { value = 1; } const target = new Datum(); const key = 'value'; target[key];",
  nested: "const table: Record<string, { run: () => number }> = {}; const key = 'a'; table[key];",
};
export const rejectedDataCases: Readonly<Record<string, string>> = {
  i18:
    'const isFactory = (v: unknown): v is (code: string) => () => unknown => typeof v === "function";' +
    'const factory: unknown = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor");' +
    'export const readHome = (): unknown => (isFactory(factory) ? factory("return(process.env.HOME)")() : undefined);',
  functionGeneric: "function read<T extends () => void>(target: Record<string, T>, k: string) { return target[k]; }",
  unionNullable: "function read(target: Record<string, number> | null, key: string) { return target[key]; }",
  angleSyntax: "const target = <Record<string, number>>{}; const key = 'a'; target[key];",
  keyAlias: "const table = { a: 1 }; const k = 'a' as any; const key = k; table[key];",
  any: "function read(target: any, key: string) { return target[key]; }",
  unknown: "function read(target: unknown, key: string) { return target[key]; }",
  functionObject: "function read(target: () => void, key: string) { return target[key]; }",
  constructorClass: "class Datum { static value = 1; } const key = 'value'; Datum[key];",
  ambient: "const target = globalThis; const key = 'process'; target[key];",
  unnamedAmbient: "const target = Math; const key: keyof Math = 'PI'; target[key];",
  functions: "const table: Record<string, () => number> = {}; const key = 'a'; table[key];",
  constructors: "const table: Record<string, new () => object> = {}; const key = 'a'; table[key];",
  mixed: "const table: Record<string, number | (() => number)> = {}; const key = 'a'; table[key];",
  anyValue: "const table: Record<string, any> = {}; const key = 'a'; table[key];",
  unknownValue: "const table: Record<string, unknown> = {}; const key = 'a'; table[key];",
  functionReturn: "const list = [1]; const key: keyof number[] = 'map'; list[key];",
  anyReturn: "const table = {}; const key: string = ''; table[key];",
  castToAny: "const target = {} as any; const key = 'a'; target[key];",
  castToNever: "const target = {} as never; const key = 'a'; target[key];",
  doubleCast: "const target = (() => 1) as unknown as Record<string, number>; const key = 'a'; target[key];",
  castKey: "const target = { a: 1 }; const key = 'a' as keyof typeof target; target[key];",
  neverKey: "const target = { a: 1 }; target['a' as never];",
  anyKey: "const target = { a: 1 }; target['a' as any];",
  doubleKey: "const target = { a: 1 }; target[(1 as unknown) as keyof typeof target];",
  castAlias:
    "const original = {} as unknown as Record<string, number>;" +
    "const target = original; const key = 'a'; target[key];",
  castAssignment:
    "let target: Record<string, number> = {}; target = {} as Record<string, number>;" + "const key = 'a'; target[key];",
  castReturn:
    "function data() { return {} as Record<string, number>; }" + "const target = data(); const key = 'a'; target[key];",
  castLiteral: "const target = {} as Record<string, number>; target['a'];",
  joinedConstructor: 'const target: Record<string, number> = {}; target["con" + "structor"];',
  constructorAlias: 'const target: Record<string, number> = {}; const key = "con" + "structor"; target[key];',
  constructorChain: "[].constructor.constructor;",
  protoDot: "const target = {}; target.__proto__;",
  protoLiteral: "const target = {}; target['__proto__'];",
  prototypeDot: "const target = {}; target.prototype;",
  prototypeLiteral: "const target = {}; target['prototype'];",
  typedKey: "function read(target: Record<string, number>, key: 'a' | '__proto__') { return target[key]; }",
  destructured: "const { constructor: factory } = [];",
  literalDestructured: "const { ['__proto__']: factory } = {};",
  indirect: 'const k = "constr" + "uctor"; ([]["filter"])[k]("return 1")();',
  kenon: 'const factory = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor"); factory("return 1")();',
};
