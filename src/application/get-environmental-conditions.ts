import type { AtmosphereProvider } from "./atmosphere-provider";
import type { Atmosphere } from "../domain/atmosphere";
import type { Region } from "../domain/geography";
import type { WeatherForecast } from "../domain/weather";
import {
  getMarineConditions,
  type MarineProvider,
  type RegionalMarineConditions,
} from "./get-marine-conditions";
import type { WeatherProvider } from "./weather-provider";
export interface EnvironmentalConditions extends RegionalMarineConditions {
  weather: WeatherForecast;
  atmosphere?: Atmosphere;
}
export async function getEnvironmentalConditions(
  stationId: string,
  marine: MarineProvider,
  weather: WeatherProvider,
  region: Region,
  atmosphere?: AtmosphereProvider,
): Promise<EnvironmentalConditions> {
  const data = await getMarineConditions(stationId, marine, region);
  const [forecast, extra] = await Promise.all([
    weather.getForecast({
      latitude: data.station.latitude,
      longitude: data.station.longitude,
    }),
    atmosphere?.getAtmosphere({
      latitude: data.station.latitude,
      longitude: data.station.longitude,
    }),
  ]);
  return {
    ...data,
    weather: forecast,
    ...(extra ? { atmosphere: extra } : {}),
  };
}
