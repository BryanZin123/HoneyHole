import { entranceWarnings } from "../application/entrance-warnings";
import { NwsWarnings } from "./nws-warnings";
// Route bundles must share the same process gate, not instantiate separate throttles.
const runtime = globalThis as typeof globalThis & {
  honeyholeEntranceWarnings?: ReturnType<typeof entranceWarnings>;
};
export const loadEntranceWarnings = (runtime.honeyholeEntranceWarnings ??=
  entranceWarnings(new NwsWarnings()));
