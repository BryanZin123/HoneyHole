import type { Coordinates } from "../domain/geography";
import type { WeatherForecast } from "../domain/weather";
export interface WeatherProvider {
  getForecast(coordinates: Coordinates): Promise<WeatherForecast>;
}
