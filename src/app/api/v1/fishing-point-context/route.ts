import { handleFishingPointRequest } from "../../../../application/fishing-point-http";
import { CdfwShorelineProvider } from "../../../../infrastructure/cdfw-shoreline";
import { CaliforniaHabitatEvidence } from "../../../../infrastructure/california-habitat";
import { NwsWeatherProvider } from "../../../../infrastructure/nws";
import { NwsAtmosphereProvider } from "../../../../infrastructure/nws-atmosphere";
import { nearbyTideReference } from "../../../../infrastructure/nearby-tide-reference";
export const dynamic = "force-dynamic";
export function POST(request: Request) {
  return handleFishingPointRequest(
    request,
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    {
      shoreline: new CdfwShorelineProvider(),
      habitat: new CaliforniaHabitatEvidence(),
      weather: new NwsWeatherProvider(),
      atmosphere: new NwsAtmosphereProvider(),
      tides: { get: nearbyTideReference },
    },
  );
}
