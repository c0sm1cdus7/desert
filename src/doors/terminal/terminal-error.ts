// Only catalogued opening failures reach the person; arbitrary exceptions never become terminal output.
import { everySaid, isPhrase, meant, same, type Text } from "../../fields/phrases.ts";
import { SocketOpeningError } from "../socket/wire/socket-error.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
/** A catalogued text said with any versions in it: the same words, in every language or in the working one. */
const shaped = (text: Text, specimens: readonly string[], part: string): readonly RegExp[] =>
  [everySaid(text), meant(text)].map(
    said =>
      new RegExp(`^${specimens.reduce((source, each) => source.replaceAll(escaped(each), part), escaped(said))}$`, "u"),
  );
const versions = [
  ...shaped(socketTexts.version(1111, 2222), ["1111", "2222"], "\\d+"),
  ...shaped(socketTexts.node("11.11.11", "22.22.22"), ["11.11.11", "22.22.22"], "[\\d.]+"),
];
/** Before the house says who is reading, a failure is said in every language. */
export function terminalError(error: unknown): string {
  if (!(error instanceof Error)) return everySaid(socketTexts.startFailed);
  const reason = error.message;
  if (error instanceof SocketOpeningError) return reason;
  if (versions.some(shape => shape.test(reason))) return reason;
  const known = [...Object.values(socketTexts), journalTexts.locked].find(
    text => isPhrase(text) && (same(reason, text) || reason === everySaid(text)),
  );
  return isPhrase(known) ? everySaid(known) : everySaid(socketTexts.startFailed);
}
