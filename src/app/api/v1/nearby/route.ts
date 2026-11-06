import { findNearby, parseNearby } from "../../../../application/find-nearby";
import { body } from "../../../../application/account-http";
import { UserDataError } from "../../../../domain/user-data";
import { StateParksDiscovery } from "../../../../infrastructure/state-parks-discovery";
import { CaliforniaRegulationProvider } from "../../../../infrastructure/california-effective-rules";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const respond = (data: unknown, status: number) =>
    Response.json(data, {
      status,
      headers: { "Cache-Control": "private, no-store", "X-API-Version": "1" },
    });
  if (
    request.headers.get("origin") !==
    (process.env.BETTER_AUTH_URL ?? "http://localhost:3000")
  )
    return respond({ error: "Request origin rejected." }, 403);
  if (new URL(request.url).search)
    return respond({ error: "Use the private search body." }, 400);
  let plan;
  try {
    plan = parseNearby(await body(request));
  } catch (e) {
    return respond(
      {
        error:
          "Choose a valid center, 1–50 km radius, date and fishing preferences.",
      },
      e instanceof UserDataError ? e.status : 400,
    );
  }
  try {
    const r = await findNearby(
      plan,
      new StateParksDiscovery(),
      await new CaliforniaRegulationProvider().getRules(),
      new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Los_Angeles",
      }),
    );
    return respond(r, r.status === "available" ? 200 : 502);
  } catch {
    return respond(
      {
        error:
          "Nearby discovery is unavailable. No substitute areas generated.",
      },
      502,
    );
  }
}
