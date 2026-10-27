// The client installation every test database stands for (owner answers Q4/Q20: the database is the client and it
// declares its language). Declared once here; a test about another language declares its own installation.
import { clientInstallation } from "../storage/client-installation.ts";

export const testInstallation = clientInstallation({ language: "en" });
