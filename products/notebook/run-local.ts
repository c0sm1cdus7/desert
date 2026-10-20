import { fileURLToPath } from "node:url";
import { openNotebookLocal } from "./local.ts";
import { watchNotebook } from "./watch-local.ts";

const [operation, reference, payload, subject] = process.argv.slice(2);
const supported = ["prepare", "accept", "read", "receipt", "watch"];
if (!operation || !supported.includes(operation) || (operation !== "watch" && !reference)) {
  console.error("Usage: notebook:local prepare <journey> <input-json> [subject] | accept <intent> <digest> | read <journey> [subject] | receipt <intent> | watch");
  process.exitCode = 1;
} else {
  const notebook = await openNotebookLocal(fileURLToPath(new URL("../../.local/notebook/", import.meta.url)));
  try {
    const { session } = notebook;
    let result: unknown;
    if (operation === "watch") {
      await watchNotebook(session);
    } else if (operation === "prepare") {
      if (payload === undefined) throw new Error("Input JSON is required");
      const input: unknown = JSON.parse(payload);
      const run = await session.begin(reference!, subject);
      result = await session.prepare(run.id, input);
    } else if (operation === "accept") {
      if (!payload) throw new Error("Confirmation digest is required");
      result = await session.accept(reference!, payload);
    } else if (operation === "read") {
      result = await session.read((await session.begin(reference!, payload)).id);
    } else result = await session.receipt(reference!);
    if (operation !== "watch") console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Local operation failed");
    process.exitCode = 1;
  } finally { await notebook.close(); }
}
