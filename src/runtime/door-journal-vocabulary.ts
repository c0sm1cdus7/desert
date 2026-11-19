// Index every historical credential before replay so embedded material cannot reenter public projections.
import { scrubDoorValue } from "../house/doors/door-material.ts";
import { emptyDoors, type DoorState } from "../house/doors/door-state.ts";
import { deepFreeze, type Foreign, type Vocabulary } from "../journal/vocabulary.ts";
export function doorJournalVocabulary<P extends Foreign>(words: Vocabulary<P>) {
  let doors: DoorState = emptyDoors;
  let protectedReads = false;
  return {
    protect: () => {
      protectedReads = true;
    },
    words: {
      ...words,
      read: (value: unknown) => {
        const event = words.read(value);
        if (event.layer === "house" && event.kind === "door-key-issued" && !doors.keys.has(event.data.id))
          doors = { ...doors, keys: new Map(doors.keys).set(event.data.id, { ...event.data, revoked: false }) };
        if (event.layer === "house" && event.kind === "door-invitation-issued" && !doors.invitations.has(event.data.id))
          doors = {
            ...doors,
            invitations: new Map(doors.invitations).set(event.data.id, { ...event.data, redeemed: false }),
          };
        const clean = protectedReads ? scrubDoorValue(event, doors) : event;
        deepFreeze(clean);
        return clean;
      },
    },
  };
}
