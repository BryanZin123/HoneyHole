import { NwsAtmosphereProvider } from "../../../../infrastructure/nws-atmosphere";
import { getEnvironmentalConditions } from "../../../../application/get-environmental-conditions";
import { NoaaMarineProvider } from "../../../../infrastructure/noaa";
import { NwsWeatherProvider } from "../../../../infrastructure/nws";
import { activeRegion } from "../../../../config/regions";
export async function GET(request: Request) {
  const station = new URL(request.url).searchParams.get("station") ?? "";
  const headers = { "Cache-Control": "no-store", "X-API-Version": "1" };
  if (!/^\d{7}$/.test(station))
    return Response.json(
      { error: "Enter a seven-digit NOAA station ID." },
      { status: 400, headers },
    );
  try {
    return Response.json(
      await getEnvironmentalConditions(
        station,
        new NoaaMarineProvider(),
        new NwsWeatherProvider(
          fetch,
          () => new Date(),
          6 * 60 * 60 * 1000,
          process.env.HONEYHOLE_USER_AGENT,
        ),
        activeRegion,
        new NwsAtmosphereProvider(),
      ),
      { headers },
    );
  } catch {
    return Response.json(
      {
        error:
          "Unable to verify a NOAA station in the active region. Check the station ID or try again later.",
      },
      { status: 502, headers },
    );
  }
}
