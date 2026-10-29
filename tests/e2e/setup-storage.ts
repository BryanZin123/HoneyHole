import { openAccounts } from "../../src/infrastructure/accounts";
import { resolve } from "node:path";
async function main() {
  if (
    !process.env.HONEYHOLE_DATA_DIR ||
    !process.env.BETTER_AUTH_SECRET ||
    !process.env.BETTER_AUTH_URL
  )
    throw Error("Explicit isolated test storage required");
  const store = await openAccounts({
    file: resolve(process.env.HONEYHOLE_DATA_DIR, "honeyhole.sqlite"),
    secret: process.env.BETTER_AUTH_SECRET,
    origin: process.env.BETTER_AUTH_URL,
    migrate: true,
  });
  store.db.close();
}
void main();
