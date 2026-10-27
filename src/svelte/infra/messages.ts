// How a piece shows a sentence of the SDK catalog (plan §14): `{say(m.lock.unlock)}`, never a literal. The renderer ships
// one locale (rendererLocale); the bundle checks the key and its parameters, so a missing key fails loudly.
import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages } from "../../messages/keys.ts";
import type { Message } from "../../views/definition.ts";
import type { MessageParameters } from "../../messages/catalog.ts";

const bundle = Messages.bundle(rendererLocale);

export const say = (message: Message, parameters?: MessageParameters): string => bundle.text(message, parameters);
