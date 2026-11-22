// Declares the independent halves of a communication between programs.
import type { TSchema } from "@sinclair/typebox";

export type ContractAction = Readonly<{ input: TSchema; output: TSchema; rejections: TSchema }>;
export type ContractObject = Readonly<{ key: TSchema; data: TSchema; reading: "house" }>;
export type ContractNotice = Readonly<{ data: TSchema; reading: "house" }>;
export type ContractInterface = Readonly<{
  actions: Readonly<Record<string, ContractAction>>;
  objects: Readonly<Record<string, ContractObject>>;
  notices: Readonly<Record<string, ContractNotice>>;
}>;
