import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import {
  defaultPreferences,
  UserDataError,
  type SavedPin,
  type PinInput,
  type Preferences,
} from "../domain/user-data";
import type { UserDataRepository } from "../application/user-data-repository";
type Row = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes: string;
  privacy: "PRIVATE";
  sharing_eligible: number;
  source_id: string | null;
  created_at: string;
  updated_at: string;
};
const pin = (r: Row): SavedPin => ({
  id: r.id,
  name: r.name,
  latitude: r.latitude,
  longitude: r.longitude,
  notes: r.notes,
  privacy: r.privacy,
  sharingEligible: !!r.sharing_eligible,
  sourceId: r.source_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export class SqliteUserData implements UserDataRepository {
  constructor(private db: Database.Database) {}
  private owner(id: string) {
    if (!this.db.prepare("SELECT id FROM user WHERE id = ?").get(id))
      throw new UserDataError(401, "Sign in required.");
  }
  list(owner: string) {
    this.owner(owner);
    return (
      this.db
        .prepare(
          "SELECT * FROM honey_holes WHERE owner_id = ? ORDER BY created_at DESC, id",
        )
        .all(owner) as Row[]
    ).map(pin);
  }
  get(owner: string, id: string) {
    this.owner(owner);
    const r = this.db
      .prepare("SELECT * FROM honey_holes WHERE owner_id = ? AND id = ?")
      .get(owner, id) as Row | undefined;
    if (!r) throw new UserDataError(404, "Pin not found.");
    return pin(r);
  }
  create(owner: string, p: PinInput) {
    this.owner(owner);
    const id = randomUUID(),
      now = new Date().toISOString();
    try {
      this.db
        .prepare(
          "INSERT INTO honey_holes (id,owner_id,name,latitude,longitude,notes,privacy,sharing_eligible,source_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          owner,
          p.name,
          p.latitude,
          p.longitude,
          p.notes,
          "PRIVATE",
          Number(p.sharingEligible),
          p.sourceId,
          now,
          now,
        );
    } catch (e) {
      if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE")
        throw new UserDataError(409, "This location is already saved.");
      throw e;
    }
    return this.get(owner, id);
  }
  update(owner: string, id: string, p: PinInput) {
    this.get(owner, id);
    try {
      this.db
        .prepare(
          "UPDATE honey_holes SET name=?,latitude=?,longitude=?,notes=?,sharing_eligible=?,source_id=?,updated_at=? WHERE id=? AND owner_id=?",
        )
        .run(
          p.name,
          p.latitude,
          p.longitude,
          p.notes,
          Number(p.sharingEligible),
          p.sourceId,
          new Date().toISOString(),
          id,
          owner,
        );
    } catch (e) {
      if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE")
        throw new UserDataError(409, "This location is already saved.");
      throw e;
    }
    return this.get(owner, id);
  }
  delete(owner: string, id: string) {
    this.get(owner, id);
    this.db.transaction(() => {
      const pref = this.preferences(owner);
      this.db
        .prepare("DELETE FROM honey_holes WHERE id=? AND owner_id=?")
        .run(id, owner);
      if (pref.favoriteIds.includes(id))
        this.savePreferences(owner, {
          ...pref,
          favoriteIds: pref.favoriteIds.filter((x) => x !== id),
        });
    })();
  }
  preferences(owner: string): Preferences {
    this.owner(owner);
    const r = this.db
      .prepare("SELECT value FROM user_preferences WHERE owner_id=?")
      .get(owner) as { value: string } | undefined;
    return r ? JSON.parse(r.value) : structuredClone(defaultPreferences);
  }
  savePreferences(owner: string, p: Preferences) {
    this.owner(owner);
    if (
      p.favoriteIds.some(
        (id) =>
          !this.db
            .prepare("SELECT id FROM honey_holes WHERE owner_id=? AND id=?")
            .get(owner, id),
      )
    )
      throw new UserDataError(400, "Invalid favorite selection.");
    const now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO user_preferences (owner_id,value,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
      )
      .run(owner, JSON.stringify(p), now, now);
    return this.preferences(owner);
  }
}
