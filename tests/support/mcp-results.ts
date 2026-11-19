// Validates the MCP replies used by door tests before inspecting their contents.
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
export function mcpJson<S extends TSchema>(schema: S, text: string): Static<S> {
  const value: unknown = JSON.parse(text);
  if (!Value.Check(schema, value)) throw new Error("Unexpected MCP response shape");
  return value;
}
const resultSchema = Type.Object({
  result: Type.Object({ content: Type.Array(Type.Object({ text: Type.String() })), isError: Type.Boolean() }),
});
export const mcpResult = (body: string) => mcpJson(resultSchema, body).result;
type Result = ReturnType<typeof mcpResult>;
export function mcpText(result: Result): string {
  const first = result.content[0];
  if (!first) throw new Error("Missing MCP text");
  return first.text;
}
export const mcpRows = (result: Result): unknown => JSON.parse(mcpText(result));
export const mcpList = (result: Result) =>
  mcpText(result)
    .split("\n")
    .map(line => mcpJson(Type.Object({ id: Type.String() }), line));
export const mcpActions = (result: Result) =>
  mcpJson(
    Type.Array(
      Type.Object({
        program: Type.String(),
        herramienta: Type.String(),
        action: Type.String(),
        target: Type.Optional(Type.String()),
        motivo: Type.Optional(Type.String()),
      }),
    ),
    mcpText(result),
  );
export const mcpCatalog = (body: string) =>
  mcpJson(
    Type.Object({
      result: Type.Object({
        tools: Type.Array(
          Type.Object({
            name: Type.String(),
            description: Type.String(),
            inputSchema: Type.Object({
              properties: Type.Record(Type.String(), Type.Unknown()),
              required: Type.Optional(Type.Array(Type.String())),
            }),
          }),
        ),
      }),
    }),
    body,
  ).result.tools;
