// Declara artefactos de programas, ofertas enlazables y casos independientes de quien pide.
import type { ContractAction, ContractInterface, ContractNotice, ContractObject } from "./contract-types.ts";
export type ContractCaseStep =
  | Readonly<{ kind: "action"; name: string; input: unknown; expect: unknown }>
  | Readonly<{ kind: "read"; name: string; key: unknown; at: "current" | "notice"; expect: unknown }>
  | Readonly<{ kind: "notices"; name: string; expect: unknown }>;
export type ContractCase = Readonly<{
  id: string;
  actor: string;
  prepare: unknown;
  steps: readonly ContractCaseStep[];
}>;
export type ContractRequest = ContractInterface & Readonly<{ casos: readonly ContractCase[] }>;
export type ContractOffer = Readonly<{
  version: string;
  acciones: Readonly<Record<string, ContractAction & Readonly<{ ruta: string }>>>;
  objetos: Readonly<Record<string, ContractObject & Readonly<{ proyector: string }>>>;
  avisos: Readonly<Record<string, ContractNotice & Readonly<{ hecho: string }>>>;
}>;
export type ContractProjector = (own: Readonly<Record<string, unknown>>, key: unknown) => unknown;
export type ContractPackage = Readonly<{
  id: string;
  version: string;
  artifact: string;
  desert: number;
  herramientas: Readonly<Record<string, readonly string[]>>;
  hechos: readonly string[];
  proyectores: Readonly<Record<string, ContractProjector>>;
  ofrece: Readonly<Record<string, ContractOffer>>;
  pide: Readonly<Record<string, ContractRequest>>;
}>;
