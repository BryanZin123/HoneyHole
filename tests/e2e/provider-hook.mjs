// Test-process preload only. Never imported by application code.
// Synthetic records; no real shoreline/access assertion or third-party dataset copy.
const originalFetch = globalThis.fetch;
const parks =
  "https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2";
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith(parks + "/query?"))
    return Response.json({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            OBJECTID: 991,
            PARK_NAME: "Synthetic Browser Fixture SB",
            County: "San Mateo",
          },
          geometry: { type: "Point", coordinates: [-122.5, 37.5] },
        },
      ],
    });
  if (url === parks + "?f=json") return Response.json({});
  if (
    url ===
    "https://tiledimageservices2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3091_cru/ImageServer?f=json"
  )
    return Response.json({
      serviceItemId: "40dc0b4522b94bcf95910801e322be0a",
      spatialReference: { wkid: 3310 },
      pixelSizeX: 10,
      pixelSizeY: 10,
      capabilities: "Image,TilesOnly",
    });
  if (
    url.startsWith(
      "https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3115_fnu/FeatureServer/0/query?",
    )
  )
    return Response.json({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            OBJECTID: 900001,
            line: "S",
            shore_code: "6B/3A",
            source: "ESI 2006",
            esi_description: "Synthetic riprap and fine sand fixture",
            shoretype_1: "6B",
            shoretype_2: "3A",
            shoretype_3: " ",
            shoretype_1_name: "riprap",
            shoretype_2_name: "fine to medium grained sand beaches",
            shoretype_3_name: " ",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-122.5, 37.4],
              [-122.5, 37.6],
            ],
          },
        },
      ],
    });
  if (new URL(url).hostname === "127.0.0.1") return originalFetch(input, init);
  throw new Error(
    "Deterministic E2E provider outage; outbound provider calls disabled.",
  );
};
