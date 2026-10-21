import type { PinInput, SavedPin, Preferences } from "../domain/user-data";
/** Owner identity must come from a server-validated session, never client JSON. */
export interface UserDataRepository {
  list(ownerId: string): SavedPin[];
  get(ownerId: string, id: string): SavedPin;
  create(ownerId: string, pin: PinInput): SavedPin;
  update(ownerId: string, id: string, pin: PinInput): SavedPin;
  delete(ownerId: string, id: string): void;
  preferences(ownerId: string): Preferences;
  savePreferences(ownerId: string, value: Preferences): Preferences;
}
