import type { Coordinates } from "../domain/geography";
import type { Atmosphere } from "../domain/atmosphere";
export interface AtmosphereProvider {
  getAtmosphere(point: Coordinates): Promise<Atmosphere>;
}
