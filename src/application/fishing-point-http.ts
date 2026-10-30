import { body } from "./account-http";
import {
  getFishingPoint,
  validateFishingPointInput,
  type FishingPointPorts,
} from "./get-fishing-point";
import { UserDataError } from "../domain/user-data";
export async function handleFishingPointRequest(
  request: Request,
  origin: string,
  ports: FishingPointPorts,
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-API-Version": "1",
  };
  const json = (v: unknown, status = 200) =>
    Response.json(v, { status, headers });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);
  if (request.headers.get("origin") !== origin)
    return json({ error: "Request origin rejected." }, 403);
  let input;
  try {
    input = validateFishingPointInput(await body(request));
  } catch (e) {
    return json(
      { error: "Invalid fishing point, date or consent." },
      e instanceof UserDataError ? e.status : 400,
    );
  }
  try {
    return json(await getFishingPoint(input, ports));
  } catch {
    return json(
      {
        error:
          "Fishing-point evidence unavailable. No permission or recommendation established.",
      },
      502,
    );
  }
}
