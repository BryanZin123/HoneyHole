import { assessCoastalAccess } from "../../../../application/assess-coastal-access";
import { CaliforniaCoastalProvider } from "../../../../infrastructure/california-coastal";
import { validateCoordinates } from "../../../../domain/spatial";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const headers = { "Cache-Control": "no-store", "X-API-Version": "1" };
  const provider = new CaliforniaCoastalProvider();
  let point;
  try {
    const values = ["latitude", "longitude"].map((key) => {
      const value = params.get(key);
      if (!value || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))
        throw new Error("Invalid coordinate");
      return Number(value);
    });
    point = { latitude: values[0], longitude: values[1] };
    validateCoordinates(point);
    if (!provider.supports(point)) throw new Error("Outside region");
  } catch {
    return Response.json(
      {
        error:
          "Enter valid latitude and longitude within the California search area.",
      },
      { status: 400, headers },
    );
  }
  return Response.json(await assessCoastalAccess(point, provider), { headers });
}
