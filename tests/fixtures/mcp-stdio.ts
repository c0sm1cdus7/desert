import { compile } from "../../src/compile.ts";
import { openLocalController } from "../../src/local/controller.ts";
import { serveAgentStdio } from "../../src/mcp/stdio.ts";
import { Notebook } from "../../products/notebook/product.ts";
import type { LocalDatabase } from "../../src/local/database.ts";
import { testInstallation } from "../../src/testing/installation.ts";

const configuration = JSON.parse(process.env.DESERT_MCP_TEST_CONFIGURATION!) as { database: LocalDatabase; token: string };
delete process.env.DESERT_MCP_TEST_CONFIGURATION;
const controller = await openLocalController(compile(Notebook), { ...configuration.database, roles: ["notes"], installation: testInstallation });
const server = serveAgentStdio(controller.connect(configuration.token, "agent"));
async function close() { await server.close(); await controller.close(); }
process.stdin.once("end", () => { void close(); });
process.once("SIGTERM", () => { void close(); });
