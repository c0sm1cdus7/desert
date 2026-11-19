// Public terminal entry supports an existing router or a declared remote program.
export { startTerminal, keyWaits } from "./boot.ts";
export { openProgramTerminal, openRemoteTerminal } from "./open-terminal.ts";
export { readMcpConnection } from "../../runtime/mcp-connection-config.ts";
