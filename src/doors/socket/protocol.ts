import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../catalogs/acts.ts";
import { houseCatalog } from "../../journal/events.ts";
const name = Type.String({ minLength: 1, maxLength: 256 });
const text = Type.String();
const number = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const id = { id: name };
const tag = <T extends string>(tipo: T) => ({ tipo: Type.Literal(tipo) });
export const clientProtocol = Type.Union([
  object({ ...tag("hola"), protocolo: number, node: name, token: name }),
  object({ ...tag("acto"), ...id, act: name, target: Type.Optional(name), input: Type.Unknown(), through: number }),
  object({ ...tag("leer"), ...id, qué: name, desde: Type.Optional(number) }),
  object({ ...tag("esperar"), ...id, hasta: number }),
  object({ ...tag("defecto"), entrada: houseCatalog["tool-entry"] }),
  object(tag("apagar")),
  object(tag("chau")),
]);
const status = Type.Union(
  (["accepted", "rejected", "draft", "inconclusive", "interrupted", "processing"] as const).map(value =>
    Type.Literal(value),
  ),
);
const notice = object({
  layer: Type.Literal("house"),
  kind: Type.Literal("tool-entry"),
  data: object({ tool: text, target: text, author: text, text }),
  by: text,
  cause: Type.Array(text),
});
const done = object({
  layer: Type.Literal("house"),
  kind: Type.Literal("act-done"),
  data: object({ object: text, act: text, text }),
  by: text,
  cause: Type.Array(text),
});
export const serverProtocol = Type.Union([
  object({
    ...tag("bienvenida"),
    protocolo: number,
    identidad: name,
    admin: Type.Boolean(),
    ahora: number,
    seq: number,
  }),
  object({ ...tag("estado"), seq: number, ahora: number }),
  object({
    ...tag("resultado"),
    ...id,
    status,
    reason: Type.Optional(text),
    private: Type.Optional(text),
    efectos: Type.Array(Type.Union([notice, done])),
  }),
  object({ ...tag("respuesta"), ...id, seq: number, datos: Type.Unknown() }),
  object({ ...tag("rechazo"), id: Type.Optional(name), motivo: text }),
  object({ ...tag("cortado"), motivo: text }),
  object(tag("cerrando")),
]);
export type ClientMessage = Static<typeof clientProtocol>;
export type ServerMessage = Static<typeof serverProtocol>;
export type RequestAct = Extract<ClientMessage, { tipo: "acto" }>;
export type ResultMessage = Extract<ServerMessage, { tipo: "resultado" }>;
export function readClient(value: unknown): ClientMessage {
  if (!Value.Check(clientProtocol, value)) throw new Error("Invalid client message");
  return value;
}
export function readServer(value: unknown): ServerMessage {
  if (!Value.Check(serverProtocol, value)) throw new Error("Invalid server message");
  return value;
}
