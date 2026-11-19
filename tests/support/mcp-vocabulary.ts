// Every JSON key exposed by the MCP fixture is reviewed here, including schemas and program readings.
import { isRecord } from "../../src/fields/json-values.ts";

const vocabulary = new Set([
  // JSON-RPC and MCP content envelopes.
  "jsonrpc",
  "id",
  "result",
  "content",
  "type",
  "text",
  "isError",
  "error",
  "code",
  "message",
  // House overview, scenes and terminal notices.
  "identity",
  "since",
  "scenes",
  "general",
  "addressed",
  "recipients",
  "programs",
  "purpose",
  "notices",
  "program",
  "needs",
  "news",
  "quiet",
  "title",
  "detail",
  "opens",
  // Actions, choices, execution locations and wait results.
  "tool",
  "action",
  "name",
  "subject",
  "target",
  "input",
  "reason",
  "choices",
  "value",
  "execution",
  "at",
  "version",
  "destinations",
  "kind",
  "device",
  "seq",
  "changed",
  // Serialized input schemas and their field metadata.
  "properties",
  "required",
  "additionalProperties",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "anyOf",
  "const",
  "items",
  "uniqueItems",
  "pattern",
  "of",
  "empty",
  "key",
  "default",
  "plain",
  "placeholder",
  "verbatim",
  "some",
  "tools",
  "door",
  "publicKey",
  "invitation",
  // Identity readings and the installed fixture's object data.
  "identifier",
  "state",
  "kit",
  "doorKeys",
  "devices",
  "card",
  "count",
  // Explicit dictionary entries: scene recipients and dynamic choice sources are identifiers, not labels.
  "ana",
  "beto",
  "mind-cards",
]);

/** Text can carry JSON or newline-delimited JSON; ordinary Spanish text stays opaque. */
function structuredText(text: string): unknown[] {
  try {
    const value: unknown = JSON.parse(text);
    return [value];
  } catch {
    return text.split("\n").flatMap(line => {
      if (!/^[\[{]/u.test(line.trim())) return [];
      const value: unknown = JSON.parse(line);
      return [value];
    });
  }
}
export function checkMcpVocabulary(value: unknown, path = "$", seen = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((child: unknown, index) => checkMcpVocabulary(child, `${path}[${index}]`, seen));
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (!vocabulary.has(key)) throw new Error(`Unreviewed MCP key: ${path}.${key}`);
      seen.add(key);
      checkMcpVocabulary(child, `${path}.${key}`, seen);
      if (key === "text" && typeof child === "string")
        structuredText(child).forEach(part => checkMcpVocabulary(part, `${path}.text(JSON)`, seen));
    }
  }
  return seen;
}
