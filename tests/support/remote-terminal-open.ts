// Open the production remote terminal using only an explicitly supplied temporary MCP configuration.
import { join } from "node:path";
import { readMcpConnection, openRemoteTerminal } from "../../src/doors/terminal/public-terminal.ts";
import { shopProgram, shopShown } from "./shop.ts";
const projectDirectory = process.argv[2];
if (!projectDirectory) throw new Error("Missing synthetic configuration directory");
const connection = readMcpConnection("void", { projectDirectory, userFile: join(projectDirectory, "user.json") });
await openRemoteTerminal(connection.url, connection.key, { ...shopProgram, identities: true }, shopShown);
