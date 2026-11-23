// The validated descriptor never gets reopened by path. A full segment is replaced in place, within the cap.
import { meant } from "../../fields/phrases.ts";
import { fstatSync, ftruncateSync, writeSync } from "node:fs";
import { houseOutputBytes } from "./house-output.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
export function boundedOutput(fd: number) {
  let size = fstatSync(fd).size;
  const marker = Buffer.from(`${meant(socketTexts.outputLimit)}\n`);
  const restart = () => {
    ftruncateSync(fd, 0);
    writeSync(fd, marker);
    size = marker.length;
  };
  if (size > houseOutputBytes) restart();
  return (bytes: Buffer) => {
    if (size + bytes.length > houseOutputBytes) restart();
    const kept = bytes.subarray(Math.max(0, bytes.length - (houseOutputBytes - size)));
    writeSync(fd, kept);
    size += kept.length;
  };
}
