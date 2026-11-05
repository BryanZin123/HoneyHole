import { validDate } from "./effective-regulations";
/** Civil midnight boundaries, independently resolved so DST days are 23/25 hours. */
export function californiaDayWindow(date: string) {
  if (!validDate(date)) throw Error("Invalid California date");
  const midnight = (day: string) => {
    const nominal = Date.parse(day + "T00:00:00Z");
    let value = nominal;
    for (let i = 0; i < 3; i++) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(value);
      const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
      const represented = Date.parse(
        `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
      );
      value += nominal - represented;
    }
    return new Date(value).toISOString();
  };
  const next = new Date(Date.parse(date + "T00:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
  return { start: midnight(date), end: midnight(next) };
}
