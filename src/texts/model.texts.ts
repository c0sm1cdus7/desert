// Words of the model catalog and adapter: its failures and the limits a schema says in words.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import { object } from "../fields/visible-text.ts";
export const modelTexts = {
  unknownPrice: "No se conoce el precio",
  request: "Faltan datos del pedido o son inválidos",
  missing: "Falta el argumento",
  key: "Falta la llave del proveedor",
  transport: "Falló el transporte del proveedor",
  errorBodyEmpty: "El proveedor no informó un mensaje de error.",
  errorBodyUnreadable: "No se pudo leer el cuerpo de error del proveedor.",
  response: "La respuesta del proveedor no tiene la forma esperada",
  json: "La respuesta no contiene JSON válido",
  schema: "La respuesta no cumple el esquema completo",
  refusal: "El modelo rechazó el pedido",
  maxTokens: "El modelo alcanzó el máximo de tokens",
  jsonOnly: "Respondé solo con un objeto JSON, sin texto alrededor, que cumpla este esquema:",
};
/** The limits the provider's grammar cannot hold, said to the mind in each field's description (22/11, UNSIGNED). */
const limitWords = {
  en:
    "length=From {a} to {b} characters.|lengthMin=At least {a} characters.|lengthMax=Up to {b} characters.|" +
    "visible=Visible text: not empty and not only spaces.|pattern=In the format {a}.|format=In format {a}.|" +
    "range=From {a} to {b}.|rangeMin=From {a}.|rangeMax=Up to {b}.|above=Greater than {a}.|below=Less than {b}.|" +
    "multiple=A multiple of {a}.|items=From {a} to {b} items.|itemsMin=At least {a} items.|" +
    "itemsMax=Up to {b} items.|unique=No repeats.",
  es:
    "length=De {a} a {b} caracteres.|lengthMin=Al menos {a} caracteres.|lengthMax=Hasta {b} caracteres.|" +
    "visible=Texto visible: ni vacío ni solo espacios.|pattern=Con el formato {a}.|format=Con formato {a}.|" +
    "range=De {a} a {b}.|rangeMin=Desde {a}.|rangeMax=Hasta {b}.|above=Mayor que {a}.|below=Menor que {b}.|" +
    "multiple=Múltiplo de {a}.|items=De {a} a {b} elementos.|itemsMin=Al menos {a} elementos.|" +
    "itemsMax=Hasta {b} elementos.|unique=Sin repetidos.",
};
const limitOf = (words: string, part: string, a: string, b: string): string => {
  const found = words.split("|").find(each => each.startsWith(`${part}=`));
  if (found === undefined) throw new Error("Unknown limit");
  return found
    .slice(part.length + 1)
    .replace("{a}", a)
    .replace("{b}", b);
};
export const schemaLimit = defineMessage({
  id: "model.schema.limit",
  kind: "text",
  parameters: object({ part: Type.String(), a: Type.String(), b: Type.String() }),
  texts: {
    en: ({ part, a, b }) => limitOf(limitWords.en, part, a, b),
    es: ({ part, a, b }) => limitOf(limitWords.es, part, a, b),
  },
});
