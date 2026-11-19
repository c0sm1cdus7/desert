// Historical state-frame fixture uses the live binary envelope.
import { serialize } from "node:v8";
import { binaryFrame } from "../../../src/doors/socket/wire/frame.ts";
export const stateFrame = (value: unknown): Buffer => binaryFrame(serialize(value));
