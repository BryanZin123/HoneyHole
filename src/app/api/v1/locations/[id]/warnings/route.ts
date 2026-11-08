import { refreshEntranceWarnings } from "../../../../../../application/refresh-entrance-warnings";
import { StateParksDiscovery } from "../../../../../../infrastructure/state-parks-discovery";
import { loadEntranceWarnings } from "../../../../../../infrastructure/entrance-warning-service";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return refreshEntranceWarnings(request, (await params).id, {
    origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    get: (id) => new StateParksDiscovery().get(id),
    load: loadEntranceWarnings,
  });
}
