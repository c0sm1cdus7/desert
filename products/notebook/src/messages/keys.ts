// Generated from en.json by `npm run messages:write`; do not edit.
import { messageCatalog } from "desert-sdk/src/index.ts";

export const Messages = messageCatalog({
  "en": {
    "notebook": {
      "label": "Notebook",
      "explore": "Explore"
    },
    "notes": {
      "destination": "Notes",
      "readNotes": "Read notes",
      "subtitle": "Your private notebook.",
      "all": "Notes",
      "createNote": "Create note",
      "archiveNote": "Archive note",
      "close": "Close",
      "titleField": "Title",
      "contentField": "Content",
      "statusField": "Status"
    }
  },
} as const);
/** The accessor declarations use: `m.notes.title` is the message `{ key: "notes.title" }`. */
export const m = Messages.m;
export const MessageKeySchema = Messages.keySchema;
export type MessageKey = typeof Messages.keys[number];
