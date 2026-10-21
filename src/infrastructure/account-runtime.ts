import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openAccounts } from "./accounts";
import { handleAccountRequest } from "../application/account-http";
import { StateParksDiscovery } from "./state-parks-discovery";
let runtime: ReturnType<typeof openAccounts> | undefined;
export async function accountRoute(request: Request) {
  try {
    if (!runtime) {
      const directory = resolve(process.env.HONEYHOLE_DATA_DIR ?? ".data");
      const secret =
        process.env.BETTER_AUTH_SECRET ??
        readFileSync(resolve(directory, "auth-secret"), "utf8").trim();
      runtime = openAccounts({
        file: resolve(directory, "honeyhole.sqlite"),
        secret,
        origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      }).catch((e) => {
        runtime = undefined;
        throw e;
      });
    }
    return await handleAccountRequest(request, {
      ...(await runtime),
      resolveLocation: async (id) => {
        const p = await new StateParksDiscovery().get(id);
        return p ? { name: p.name, ...p.coordinates } : null;
      },
    });
  } catch {
    return Response.json(
      { error: "Accounts are unavailable. Local storage setup is required." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
