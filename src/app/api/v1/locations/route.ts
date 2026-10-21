import { discoverShore } from "../../../../application/discover-shore";
import { StateParksDiscovery } from "../../../../infrastructure/state-parks-discovery";
import { coastalCounties } from "../../../../config/coastal-counties";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const headers = { "Cache-Control": "no-store", "X-API-Version": "1" };
  try {
    const county = p.get("county") ?? undefined;
    if (county && !(coastalCounties as readonly string[]).includes(county))
      throw Error("Invalid county");
    const coordinateMode = p.has("latitude") || p.has("longitude");
    const number = (key: string) => {
      const s = p.get(key);
      if (!s?.trim()) throw Error("Missing value");
      const n = Number(s);
      if (!Number.isFinite(n)) throw Error("Invalid number");
      return n;
    };
    const query = coordinateMode
      ? {
          center: {
            latitude: number("latitude"),
            longitude: number("longitude"),
          },
          radiusKm: number("radiusKm"),
        }
      : { county: county ?? "San Mateo" };
    const result = await discoverShore(query, new StateParksDiscovery());
    return Response.json(result, {
      status: result.status === "available" ? 200 : 502,
      headers,
    });
  } catch {
    return Response.json(
      {
        error:
          "Choose a supported coastal county or valid coordinates with a 1–50 km radius.",
      },
      { status: 400, headers },
    );
  }
}
