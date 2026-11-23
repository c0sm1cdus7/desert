// Core tools are public infrastructure and cannot be granted or removed through a kit.
import { type Text } from "../fields/phrases.ts";
import { identityTexts } from "../texts/identities.texts.ts";
import { personalTexts } from "../texts/personal.texts.ts";
import { rulesTexts } from "../texts/rules.texts.ts";
export const coreToolReasons: Readonly<Record<string, Text>> = {
  identities: identityTexts.reserved,
  rules: rulesTexts.reserved,
  personal: personalTexts.reserved,
};
export const systemTool = (id: string): boolean => Object.hasOwn(coreToolReasons, id);
