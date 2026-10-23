# MCP agent transport

`src/mcp/index.ts` is a Node host entry point. `createAgentMcpServer(session)`
creates an MCP server for a genuine local session bound to an agent surface;
`serveAgentStdio(session)` serves it over stdin/stdout. Human sessions and copied
session-shaped objects are rejected. No port, OAuth provider or user-account
connection is created by these functions.

The server publishes the agent surface's projected catalog, not the internal
product definition. Request schemas come from `src/web/protocol.ts`. Calls use
`src/web/dispatch.ts`, the same dispatcher as HTTP, and errors use the existing
public controller-error policy. The MCP transport owns protocol handling only.

## Lifecycle

`catalog` discovers the exposed journeys and their input/read schemas.
`preflight` checks requirements without creating an execution run. `begin`
admits a journey, `prepare` produces its exact confirmation, and `accept`
executes that prepared intent. No tool combines preparation with acceptance.
Use `receipt` to resolve uncertain delivery instead of creating a new intent.
Reads and subject offers preserve the same owner and projection restrictions.

Hosts with an installed activity catalog also expose draft creation, reading,
answering, preparation and cancellation. Other hosts do not advertise those
tools. The activity's final execution still goes through `accept`.

The registered catalog does not claim that a controller is currently reachable.
Every stateful call reauthenticates and checks the installed contract. Revoking
an identity blocks subsequent MCP operations just as it blocks HTTP operations.

## Verification

- `tests/mcp.test.ts`: official protocol client, exact canonical request schemas,
  restricted surface, preparation without effects, confirmation rejection,
  idempotent acceptance, receipt recovery, ownership and identity revocation.
- `tests/mcp-stdio.test.ts`: independent Node subprocess using a real PostgreSQL
  installation and the official stdio transport, including post-start revocation.

The SDK uses the official `@modelcontextprotocol/server` package pinned to 2.3.1;
the official client is a test dependency. Credentials belong to the host's private
credential boundary, never a View, tool argument, generated build or log.
