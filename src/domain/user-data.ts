import { validateCoordinates } from "./spatial";
export class UserDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface PinInput {
  name: string;
  latitude: number;
  longitude: number;
  notes: string;
  privacy: "PRIVATE";
  sharingEligible: boolean;
  sourceId: string | null;
}
export interface SavedPin extends PinInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface Preferences {
  regions: string[];
  species: string[];
  favoriteIds: string[];
  units: "metric" | "imperial";
  timeZone: string;
  alertOptIn: boolean;
  leadMinutes: number;
  quietHours: { start: string; end: string } | null;
}
export const defaultPreferences: Preferences = {
  regions: ["california-coast"],
  species: [],
  favoriteIds: [],
  units: "metric",
  timeZone: "America/Los_Angeles",
  alertOptIn: false,
  leadMinutes: 120,
  quietHours: { start: "22:00", end: "07:00" },
};
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new UserDataError(400, "Invalid input.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((k) => !keys.includes(k)))
    throw new UserDataError(400, "Unsupported field.");
  return v;
}
function text(v: unknown, max: number, empty = false) {
  if (typeof v !== "string" || v.trim().length > max || (!empty && !v.trim()))
    throw new UserDataError(400, "Invalid text.");
  return v.trim();
}
export function validatePin(value: unknown): PinInput {
  const v = object(value, [
    "name",
    "latitude",
    "longitude",
    "notes",
    "privacy",
    "sharingEligible",
    "sourceId",
  ]);
  try {
    validateCoordinates({
      latitude: v.latitude as number,
      longitude: v.longitude as number,
    });
  } catch {
    throw new UserDataError(400, "Invalid coordinates.");
  }
  if (v.privacy !== undefined && v.privacy !== "PRIVATE")
    throw new UserDataError(400, "Public publishing is not available.");
  if (v.sharingEligible !== undefined && typeof v.sharingEligible !== "boolean")
    throw new UserDataError(400, "Invalid sharing preference.");
  if (
    v.sourceId !== undefined &&
    v.sourceId !== null &&
    (typeof v.sourceId !== "string" || !/^\d{1,10}$/.test(v.sourceId))
  )
    throw new UserDataError(400, "Invalid source reference.");
  return {
    name: text(v.name, 100),
    latitude: v.latitude as number,
    longitude: v.longitude as number,
    notes: text(v.notes ?? "", 2000, true),
    privacy: "PRIVATE",
    sharingEligible: (v.sharingEligible ?? false) as boolean,
    sourceId: (v.sourceId ?? null) as string | null,
  };
}
export function validatePreferences(value: unknown): Preferences {
  const v = object(value, Object.keys(defaultPreferences));
  for (const key of ["regions", "species", "favoriteIds"]) {
    if (
      !Array.isArray(v[key]) ||
      (v[key] as unknown[]).length > 50 ||
      (v[key] as unknown[]).some(
        (x) => typeof x !== "string" || !x.trim() || x.length > 100,
      )
    )
      throw new UserDataError(400, "Invalid preference list.");
  }
  if (
    !["metric", "imperial"].includes(v.units as string) ||
    typeof v.alertOptIn !== "boolean" ||
    !Number.isInteger(v.leadMinutes) ||
    (v.leadMinutes as number) < 0 ||
    (v.leadMinutes as number) > 10080
  )
    throw new UserDataError(400, "Invalid preferences.");
  if (typeof v.timeZone !== "string" || v.timeZone.length > 100)
    throw new UserDataError(400, "Invalid time zone.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: v.timeZone });
  } catch {
    throw new UserDataError(400, "Invalid time zone.");
  }
  if (v.quietHours !== null) {
    const q = object(v.quietHours, ["start", "end"]);
    if (
      ![q.start, q.end].every(
        (x) => typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x),
      )
    )
      throw new UserDataError(400, "Invalid quiet hours.");
  }
  return structuredClone(v) as unknown as Preferences;
}
