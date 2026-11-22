// Declares the independent halves of a communication between programs.
import type { TSchema } from "@sinclair/typebox";

export type ContractAction = Readonly<{ entrada: TSchema; salida: TSchema; rechazos: TSchema }>;
export type ContractObject = Readonly<{ clave: TSchema; datos: TSchema; lectura: "casa" }>;
export type ContractNotice = Readonly<{ datos: TSchema; lectura: "casa" }>;
export type ContractInterface = Readonly<{
  acciones: Readonly<Record<string, ContractAction>>;
  objetos: Readonly<Record<string, ContractObject>>;
  avisos: Readonly<Record<string, ContractNotice>>;
}>;
