import { mkdtempSync, rmSync, writeSync, readFileSync, fstatSync, closeSync } from "node:fs";
import { expect, it } from "vitest";
import { houseOutput } from "./house-output.ts";
import { boundedOutput } from "./bounded-output.ts";
import { houseOutputBytes } from "../catalogs/levers.ts";
import { socketTexts } from "../texts/socket.texts.ts";
it("the output keeps the exact boundary, replaces the full segment and preserves an append on reopen", () => {
  const home = mkdtempSync("/tmp/casa-output-size-");
  let fd = houseOutput(home);
  try {
    let output = boundedOutput(fd);
    output(Buffer.alloc(houseOutputBytes, 120));
    expect(fstatSync(fd).size).toBe(houseOutputBytes);
    output(Buffer.from("new\n"));
    expect(readFileSync(`${home}/casa.log`, "utf8")).toBe(`${socketTexts.outputLimit}\nnew\n`);
    closeSync(fd);
    fd = houseOutput(home);
    output = boundedOutput(fd);
    output(Buffer.from("after restart\n"));
    expect(readFileSync(`${home}/casa.log`, "utf8")).toBe(`${socketTexts.outputLimit}\nnew\nafter restart\n`);
    output(Buffer.alloc(houseOutputBytes * 3, 120));
    expect(fstatSync(fd).size).toBe(houseOutputBytes);
  } finally {
    closeSync(fd);
    rmSync(home, { recursive: true, force: true });
  }
});
it("an oversized output from the previous version is bounded even without another write", () => {
  const home = mkdtempSync("/tmp/casa-output-old-");
  const fd = houseOutput(home);
  try {
    writeSync(fd, Buffer.alloc(houseOutputBytes + 1));
    boundedOutput(fd);
    expect(fstatSync(fd).size).toBeLessThanOrEqual(houseOutputBytes);
    expect(readFileSync(`${home}/casa.log`, "utf8")).toBe(`${socketTexts.outputLimit}\n`);
  } finally {
    closeSync(fd);
    rmSync(home, { recursive: true, force: true });
  }
});
