import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { authorHouse } from "../../../tests/support/author-house.ts";
import { mcpReading } from "./mcp-reading.ts";
import { effect } from "../../house/facts.ts";
it.each(["lucia", "unnamed", "retired", "mind:sales", "assistant:lucia"])(
  "MCP keeps the id of %s in notices and readings after a rename and a reopen",
  author => {
    const home = mkdtempSync(join(tmpdir(), "mcp-author-"));
    let house = authorHouse(home, author);
    try {
      const read = () => mcpReading(house, "ana", { recentLines: 40 });
      const overview = JSON.stringify(read().read());
      expect(overview).toContain(`\\"detail\\":\\"${author}\\"`);
      const object = read().read("sales", "sales/s1");
      expect(JSON.stringify(object)).toContain(`\\"by\\":\\"${author.includes(":") ? "lucia" : author}\\"`);
      house.bus.emit(effect("named", { identity: "lucia", name: "Lucía Gómez" }, "ana"));
      expect(read().read("sales", "sales/s1")).toEqual(object);
      house.close();
      house = authorHouse(home, author);
      expect(read().read("sales", "sales/s1")).toEqual(object);
      expect(JSON.stringify(read().read())).toContain(`\\"detail\\":\\"${author}\\"`);
    } finally {
      house.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
);
