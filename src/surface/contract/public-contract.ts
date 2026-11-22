// desert/surface/contract: what a renderer or a door outside this repo reads; browser-safe, and never for a program.
export type {
  Attachment,
  Body,
  Hint,
  HintKey,
  Intent,
  Panel,
  Row,
  Screen,
  Span,
  Stack,
  Theme,
  ThreadEvent,
} from "./contract.ts";
export { hintSends } from "./hint-sends.ts";
export type { Tone } from "./tones.ts";
export type { Viewport } from "./viewport.ts";
export { parseIntent, wire, WireIntent, WireScreen } from "./wire.ts";
