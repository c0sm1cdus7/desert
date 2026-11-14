import { SocketOpeningError } from "../doors/socket/socket-error.ts";
// Only catalogued opening failures reach the person; arbitrary exceptions never become terminal output.
import { journalTexts } from "../texts/journal.texts.ts";
import { socketTexts } from "../texts/socket.texts.ts";
export function terminalError(error: unknown): string {
  if (!(error instanceof Error)) return socketTexts.startFailed;
  const reason = error.message;
  if (error instanceof SocketOpeningError) return reason;
  if (Object.values(socketTexts).some(text => typeof text === "string" && text === reason)) return reason;
  if (reason === journalTexts.locked) return journalTexts.locked;
  if (/^La casa usa el protocolo \d+ y el cliente \d+\.$/u.test(reason)) return reason;
  if (/^La casa usa Node [\d.]+ y el cliente [\d.]+\.$/u.test(reason)) return reason;
  return socketTexts.startFailed;
}
