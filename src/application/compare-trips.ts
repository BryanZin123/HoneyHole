import { tripVerification, type TripInput } from "./trip-verification";
/** Exactly two explicit identities; no fetching, scoring or winner. */
export function compareTrips(areas: TripInput[]) {
  if (areas.length !== 2 || areas[0].entrance.id === areas[1].entrance.id)
    throw Error("Choose two distinct published entrances.");
  const a = areas[0].plan,
    b = areas[1].plan;
  if (
    a.species !== b.species ||
    a.date !== b.date ||
    a.method !== b.method ||
    a.period !== b.period
  )
    throw Error(
      "Not comparable: species, California date, method and time preference must match.",
    );
  return areas.map((input) => ({
    input,
    evidenceLoaded: !!input.detail,
    summary: tripVerification(input),
  }));
}
