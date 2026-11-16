import type { TSchema } from "@sinclair/typebox";
import type { Field } from "./contract.ts";
import { surfaceTexts } from "../texts/surface.texts.ts";
/** A program supplied an amount the field cannot represent. */
export class InvalidMoney extends Error {
  readonly field: string;
  constructor(field: string, cause: unknown) {
    super(surfaceTexts.invalidMoneyDetail(field), { cause });
    this.field = field;
  }
}

export function checkMoneyScreen(schema: TSchema, field: Field): Field {
  if (schema.mask !== "money" || field.kind !== "text" || !("mask" in field)) return field;
  const mask = field.mask;
  return {
    ...field,
    mask: {
      ...mask,
      shown: typed => {
        try {
          return mask.shown(typed);
        } catch (error) {
          throw new InvalidMoney(field.ask, error);
        }
      },
    },
  };
}
