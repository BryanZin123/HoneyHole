import { body } from "./account-http";
import { validDate } from "../domain/effective-regulations";
import { validateCoordinates } from "../domain/spatial";
import type { Coordinates } from "../domain/geography";
import type { WarningEvidence } from "./warning-provider";
interface Services {
  origin: string;
  get: (id: string) => Promise<{ id: string; coordinates: Coordinates } | null>;
  load: (point: Coordinates, date: string) => Promise<WarningEvidence>;
}
export async function refreshEntranceWarnings(
  request: Request,
  id: string,
  s: Services,
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-API-Version": "1",
  };
  const error = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers });
  if (request.headers.get("origin") !== s.origin)
    return error("Request origin rejected.", 403);
  let point: Coordinates, date: string;
  try {
    const v = await body(request);
    if (
      !/^\d{1,10}$/.test(id) ||
      new URL(request.url).search ||
      !v ||
      typeof v !== "object" ||
      Object.keys(v).some(
        (k) => !["coordinates", "date", "consent"].includes(k),
      ) ||
      v.consent !== true ||
      typeof v.date !== "string" ||
      !validDate(v.date)
    )
      throw Error();
    if (
      !v.coordinates ||
      Object.keys(v.coordinates).some(
        (k) => !["latitude", "longitude"].includes(k),
      )
    )
      throw Error();
    validateCoordinates(v.coordinates);
    point = v.coordinates;
    date = v.date;
  } catch {
    return error(
      "Explicit consent, a valid date and exact published entrance coordinates are required.",
      400,
    );
  }
  try {
    const entrance = await s.get(id);
    if (!entrance)
      return error(
        "The current public entrance could not be verified. Repeat discovery.",
        404,
      );
    if (
      entrance.id !== id ||
      entrance.coordinates.latitude !== point.latitude ||
      entrance.coordinates.longitude !== point.longitude
    )
      return error(
        "Source identity or coordinates changed. Repeat discovery and consent to the current entrance.",
        409,
      );
    const evidence = await s.load(entrance.coordinates, date);
    return Response.json(evidence, { headers });
  } catch {
    return error(
      "Warning refresh unavailable; the current entrance or source could not be verified.",
      502,
    );
  }
}
