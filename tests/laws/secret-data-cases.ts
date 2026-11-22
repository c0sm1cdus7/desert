/** Source fixtures, never executed: ordinary indexed data and neighboring capability escapes. */
export const dataCases: Readonly<Record<string, string>> = {
  objetoGenerico:
    "function read<T extends readonly number[]>(lista: T, i: number) { return lista[i]; }" + "return read([1], 0);",
  textoGenerico: "function read<T extends string>(texto: T, i: number) { return texto[i]; } return read('hello', 0);",
  interseccionDatos: "function read(lista: number[] & { kind: string }, i: number) { return lista[i]; }",
  generico:
    "function read<K extends 'a' | 'b'>(tabla: Record<K, number>, k: K) { return tabla[k]; }" +
    "return read({ a: 1 }, 'a');",
  registroFinito:
    "const tabla: Readonly<Record<'a' | 'b', string>> = { a: 'one', b: 'two' };" +
    "const k: keyof typeof tabla = 'a'; return tabla[k];",
  vacio: "const lista: never[] = []; const i: number = 0; return lista[i];",
  opcional:
    "function read(tabla?: Record<string, number>) { const k: string = 'a'; return tabla?.[k]; } return read();",
  arrayReadonly: "const lista: readonly number[] = [1]; const i: number = 0; return lista[i];",
  lista: "const lista: number[] = [1]; const i: number = 0; return lista[i];",
  tupla: "const tupla: [string, number] = ['a', 1]; const n: number = 0; return tupla[n];",
  texto: "const texto = 'hello'; const i: number = 0; return texto[i];",
  tabla:
    "const tabla: Record<string, { valor: number }> = { a: { valor: 1 } };" +
    "const code: string = 'a'; return tabla[code];",
  porId:
    "const porId: { [id: string]: { kind: string; activo?: boolean } } = {};" +
    "const id: string = 'a'; return porId[id];",
  finito: "const tabla = { a: 1, b: 'two' }; const code: keyof typeof tabla = 'a'; return tabla[code];",
  readonly: "const lista = [{ valor: 1 }] as const; const i: number = 0; return lista[i];",
  union: "const tabla: Record<string, number | null | undefined> = {}; const k: string = ''; return tabla[k];",
  recursivo:
    "interface Dato { hijos: Dato[]; valor: string }" +
    "const tabla: Record<string, Dato> = {}; const k: string = ''; return tabla[k];",
  satisfies: "const tabla = { a: 1 } satisfies Record<string, number>; const k = 'a'; return tabla[k];",
  textoPublico:
    "const tabla = { a: 'constructor', b: '__proto__', c: 'prototype' };" +
    "const k: keyof typeof tabla = 'a'; return tabla[k];",
};
/** Deliberate changes in step 7b: only the chosen value matters. */
export const admittedRevisedCases: Readonly<Record<string, string>> = {
  indiceMixto:
    "function read(tabla: { [k: string]: number | (() => void); a: number }) {" + "const k = 'a'; return tabla[k]; }",
  interseccion: "function read(objeto: number[] & { run: () => void }, key: number) { return objeto[key]; }",
  clase: "class Dato { valor = 1; } const objeto = new Dato(); const key = 'valor'; objeto[key];",
  anidado: "const tabla: Record<string, { run: () => number }> = {}; const key = 'a'; tabla[key];",
};
export const rejectedDataCases: Readonly<Record<string, string>> = {
  i18:
    'const esFabrica = (v: unknown): v is (code: string) => () => unknown => typeof v === "function";' +
    'const fabrica: unknown = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor");' +
    'export const lee = (): unknown => (esFabrica(fabrica) ? fabrica("return(process.env.HOME)")() : undefined);',
  genericoFuncion: "function read<T extends () => void>(objeto: Record<string, T>, k: string) { return objeto[k]; }",
  unionNullable: "function read(objeto: Record<string, number> | null, key: string) { return objeto[key]; }",
  sintaxisAngular: "const objeto = <Record<string, number>>{}; const key = 'a'; objeto[key];",
  aliasClave: "const tabla = { a: 1 }; const k = 'a' as any; const key = k; tabla[key];",
  any: "function read(objeto: any, key: string) { return objeto[key]; }",
  unknown: "function read(objeto: unknown, key: string) { return objeto[key]; }",
  funcion: "function read(objeto: () => void, key: string) { return objeto[key]; }",
  claseConstructora: "class Dato { static valor = 1; } const key = 'valor'; Dato[key];",
  ambiente: "const objeto = globalThis; const key = 'process'; objeto[key];",
  ambienteSinNombre: "const objeto = Math; const key: keyof Math = 'PI'; objeto[key];",
  funciones: "const tabla: Record<string, () => number> = {}; const key = 'a'; tabla[key];",
  constructores: "const tabla: Record<string, new () => object> = {}; const key = 'a'; tabla[key];",
  mezcla: "const tabla: Record<string, number | (() => number)> = {}; const key = 'a'; tabla[key];",
  valorAny: "const tabla: Record<string, any> = {}; const key = 'a'; tabla[key];",
  valorUnknown: "const tabla: Record<string, unknown> = {}; const key = 'a'; tabla[key];",
  retornoFuncion: "const lista = [1]; const key: keyof number[] = 'map'; lista[key];",
  retornoAny: "const tabla = {}; const key: string = ''; tabla[key];",
  anyConvertido: "const objeto = {} as any; const key = 'a'; objeto[key];",
  neverConvertido: "const objeto = {} as never; const key = 'a'; objeto[key];",
  dobleConversion: "const objeto = (() => 1) as unknown as Record<string, number>; const key = 'a'; objeto[key];",
  claveConvertida: "const objeto = { a: 1 }; const key = 'a' as keyof typeof objeto; objeto[key];",
  claveNever: "const objeto = { a: 1 }; objeto['a' as never];",
  claveAny: "const objeto = { a: 1 }; objeto['a' as any];",
  claveDoble: "const objeto = { a: 1 }; objeto[(1 as unknown) as keyof typeof objeto];",
  aliasConversion:
    "const original = {} as unknown as Record<string, number>;" +
    "const objeto = original; const key = 'a'; objeto[key];",
  asignacionConversion:
    "let objeto: Record<string, number> = {}; objeto = {} as Record<string, number>;" + "const key = 'a'; objeto[key];",
  retornoConversion:
    "function data() { return {} as Record<string, number>; }" + "const objeto = data(); const key = 'a'; objeto[key];",
  literalConvertido: "const objeto = {} as Record<string, number>; objeto['a'];",
  constructorCompuesto: 'const objeto: Record<string, number> = {}; objeto["con" + "structor"];',
  constructorAlias: 'const objeto: Record<string, number> = {}; const key = "con" + "structor"; objeto[key];',
  cadenaConstructores: "[].constructor.constructor;",
  protoPunto: "const objeto = {}; objeto.__proto__;",
  protoLiteral: "const objeto = {}; objeto['__proto__'];",
  prototypePunto: "const objeto = {}; objeto.prototype;",
  prototypeLiteral: "const objeto = {}; objeto['prototype'];",
  claveTipada: "function read(objeto: Record<string, number>, key: 'a' | '__proto__') { return objeto[key]; }",
  desestructurado: "const { constructor: fabrica } = [];",
  desestructuradoLiteral: "const { ['__proto__']: fabrica } = {};",
  indirecta: 'const k = "constr" + "uctor"; ([]["filter"])[k]("return 1")();',
  kenon: 'const fabrica = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor"); fabrica("return 1")();',
};
