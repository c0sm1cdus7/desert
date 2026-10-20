import { Type, type Static } from "@sinclair/typebox";

const Reference = Type.String({ minLength: 1 });
const closed = { additionalProperties: false };

export const Requests = {
  begin: Type.Object({ journeyId: Reference, subject: Type.Optional(Reference) }, closed),
  prepare: Type.Object({ runId: Reference, input: Type.Unknown() }, closed),
  read: Type.Object({ runId: Reference }, closed),
  accept: Type.Object({ intentId: Reference, confirmationDigest: Reference }, closed),
  receipt: Type.Object({ intentId: Reference }, closed),
  offer: Type.Object({ journeyId: Reference, subject: Reference }, closed),
};

export type Method = keyof typeof Requests;
export type RequestInput<K extends Method> = Static<(typeof Requests)[K]>;
