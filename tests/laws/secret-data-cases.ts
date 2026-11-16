/** Source fixtures, never executed: ordinary indexed data and neighboring capability escapes. */
export const dataCases: Readonly<Record<string, string>> = {
  objetoGenerico:
    "function leer<T extends readonly number[]>(lista: T, i: number) { return lista[i]; }" + "return leer([1], 0);",
  textoGenerico: "function leer<T extends string>(texto: T, i: number) { return texto[i]; } return leer('hola', 0);",
  interseccionDatos: "function leer(lista: number[] & { nombre: string }, i: number) { return lista[i]; }",
  generico:
    "function leer<K extends 'a' | 'b'>(tabla: Record<K, number>, k: K) { return tabla[k]; }" +
    "return leer({ a: 1 }, 'a');",
  registroFinito:
    "const tabla: Readonly<Record<'a' | 'b', string>> = { a: 'uno', b: 'dos' };" +
    "const k: keyof typeof tabla = 'a'; return tabla[k];",
  vacio: "const lista: never[] = []; const i: number = 0; return lista[i];",
  opcional:
    "function leer(tabla?: Record<string, number>) { const k: string = 'a'; return tabla?.[k]; } return leer();",
  arrayReadonly: "const lista: readonly number[] = [1]; const i: number = 0; return lista[i];",
  lista: "const lista: number[] = [1]; const i: number = 0; return lista[i];",
  tupla: "const tupla: [string, number] = ['a', 1]; const n: number = 0; return tupla[n];",
  texto: "const texto = 'hola'; const i: number = 0; return texto[i];",
  tabla:
    "const tabla: Record<string, { valor: number }> = { a: { valor: 1 } };" +
    "const codigo: string = 'a'; return tabla[codigo];",
  porId:
    "const porId: { [id: string]: { nombre: string; activo?: boolean } } = {};" +
    "const id: string = 'a'; return porId[id];",
  finito: "const tabla = { a: 1, b: 'dos' }; const codigo: keyof typeof tabla = 'a'; return tabla[codigo];",
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
    "function leer(tabla: { [k: string]: number | (() => void); a: number }) {" + "const k = 'a'; return tabla[k]; }",
  interseccion: "function leer(objeto: number[] & { run: () => void }, clave: number) { return objeto[clave]; }",
  clase: "class Dato { valor = 1; } const objeto = new Dato(); const clave = 'valor'; objeto[clave];",
  anidado: "const tabla: Record<string, { run: () => number }> = {}; const clave = 'a'; tabla[clave];",
};
export const rejectedDataCases: Readonly<Record<string, string>> = {
  i18:
    'const esFabrica = (v: unknown): v is (codigo: string) => () => unknown => typeof v === "function";' +
    'const fabrica: unknown = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor");' +
    'export const lee = (): unknown => (esFabrica(fabrica) ? fabrica("return(process.env.HOME)")() : undefined);',
  genericoFuncion: "function leer<T extends () => void>(objeto: Record<string, T>, k: string) { return objeto[k]; }",
  unionNullable: "function leer(objeto: Record<string, number> | null, clave: string) { return objeto[clave]; }",
  sintaxisAngular: "const objeto = <Record<string, number>>{}; const clave = 'a'; objeto[clave];",
  aliasClave: "const tabla = { a: 1 }; const k = 'a' as any; const clave = k; tabla[clave];",
  any: "function leer(objeto: any, clave: string) { return objeto[clave]; }",
  unknown: "function leer(objeto: unknown, clave: string) { return objeto[clave]; }",
  funcion: "function leer(objeto: () => void, clave: string) { return objeto[clave]; }",
  claseConstructora: "class Dato { static valor = 1; } const clave = 'valor'; Dato[clave];",
  ambiente: "const objeto = globalThis; const clave = 'process'; objeto[clave];",
  ambienteSinNombre: "const objeto = Math; const clave: keyof Math = 'PI'; objeto[clave];",
  funciones: "const tabla: Record<string, () => number> = {}; const clave = 'a'; tabla[clave];",
  constructores: "const tabla: Record<string, new () => object> = {}; const clave = 'a'; tabla[clave];",
  mezcla: "const tabla: Record<string, number | (() => number)> = {}; const clave = 'a'; tabla[clave];",
  valorAny: "const tabla: Record<string, any> = {}; const clave = 'a'; tabla[clave];",
  valorUnknown: "const tabla: Record<string, unknown> = {}; const clave = 'a'; tabla[clave];",
  retornoFuncion: "const lista = [1]; const clave: keyof number[] = 'map'; lista[clave];",
  retornoAny: "const tabla = {}; const clave: string = ''; tabla[clave];",
  anyConvertido: "const objeto = {} as any; const clave = 'a'; objeto[clave];",
  neverConvertido: "const objeto = {} as never; const clave = 'a'; objeto[clave];",
  dobleConversion: "const objeto = (() => 1) as unknown as Record<string, number>; const clave = 'a'; objeto[clave];",
  claveConvertida: "const objeto = { a: 1 }; const clave = 'a' as keyof typeof objeto; objeto[clave];",
  claveNever: "const objeto = { a: 1 }; objeto['a' as never];",
  claveAny: "const objeto = { a: 1 }; objeto['a' as any];",
  claveDoble: "const objeto = { a: 1 }; objeto[(1 as unknown) as keyof typeof objeto];",
  aliasConversion:
    "const original = {} as unknown as Record<string, number>;" +
    "const objeto = original; const clave = 'a'; objeto[clave];",
  asignacionConversion:
    "let objeto: Record<string, number> = {}; objeto = {} as Record<string, number>;" +
    "const clave = 'a'; objeto[clave];",
  retornoConversion:
    "function datos() { return {} as Record<string, number>; }" +
    "const objeto = datos(); const clave = 'a'; objeto[clave];",
  literalConvertido: "const objeto = {} as Record<string, number>; objeto['a'];",
  constructorCompuesto: 'const objeto: Record<string, number> = {}; objeto["con" + "structor"];',
  constructorAlias: 'const objeto: Record<string, number> = {}; const clave = "con" + "structor"; objeto[clave];',
  cadenaConstructores: "[].constructor.constructor;",
  protoPunto: "const objeto = {}; objeto.__proto__;",
  protoLiteral: "const objeto = {}; objeto['__proto__'];",
  prototypePunto: "const objeto = {}; objeto.prototype;",
  prototypeLiteral: "const objeto = {}; objeto['prototype'];",
  claveTipada: "function leer(objeto: Record<string, number>, clave: 'a' | '__proto__') { return objeto[clave]; }",
  desestructurado: "const { constructor: fabrica } = [];",
  desestructuradoLiteral: "const { ['__proto__']: fabrica } = {};",
  indirecta: 'const k = "constr" + "uctor"; ([]["filter"])[k]("return 1")();',
  kenon: 'const fabrica = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor"); fabrica("return 1")();',
};
